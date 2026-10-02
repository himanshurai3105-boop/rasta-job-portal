import asyncHandler from "express-async-handler";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { sendEmail, emailTemplates } from "../utils/emailService.js";
import { notify } from "../utils/notify.js";
import { extractResumeText } from "../utils/resumeParser.js";
import { screenResume, getNextInterviewQuestion, evaluateInterview, generateMCQTest } from "../utils/aiService.js";

// @desc    Apply to a job (with resume upload)
// @route   POST /api/applications/:jobId
// @access  Private/Jobseeker
export const applyToJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job || job.status !== "active") {
    res.status(404);
    throw new Error("Job not found or no longer accepting applications");
  }

  const exists = await Application.findOne({
    job: job._id,
    applicant: req.user._id,
  });
  if (exists) {
    res.status(400);
    throw new Error("You have already applied to this job");
  }

  let resumeUrl = "";
  let resumeText = "";

  if (req.file) {
    resumeUrl = `/uploads/resumes/${req.file.filename}`;
    try {
      resumeText = (await extractResumeText(req.file.path)) || "";
    } catch (e) {
      resumeText = "";
    }
  }

  const application = await Application.create({
    job: job._id,
    applicant: req.user._id,
    employer: job.employer,
    coverLetter: req.body.coverLetter || "",
    resumeUrl: resumeUrl || req.user.resumeUrl,
    resumeText,
    aiScreening: { status: resumeText ? "pending" : "skipped" },
  });

  job.applicationsCount += 1;
  await job.save();

  res.status(201).json({ success: true, data: application });

  // Fire-and-forget — notify + email employer about the new applicant
  const employer = await User.findById(job.employer);
  if (employer) {
    notify({
      user: employer._id,
      type: "new_applicant",
      title: "New applicant received",
      message: `${req.user.name} applied to "${job.title}".`,
      link: `/employer/jobs/${job._id}/applicants`,
    });
    const template = emailTemplates.newApplicant(job.title, req.user.name);
    sendEmail({ to: employer.email, ...template });
  }

  // Fire-and-forget — AI resume screening
  if (resumeText) {
    try {
      const result = await screenResume({
        jobTitle: job.title,
        jobDescription: job.description,
        jobRequirements: job.requirements,
        resumeText,
      });
      await Application.findByIdAndUpdate(application._id, {
        aiScreening: {
          score: result.score,
          summary: result.summary,
          strengths: result.strengths || [],
          gaps: result.gaps || [],
          status: "completed",
        },
      });
    } catch (err) {
      await Application.findByIdAndUpdate(application._id, { "aiScreening.status": "failed" });
      console.error("AI screening failed:", err.message);
    }
  }
});

// @desc    Get single application (for interview page / status checks)
// @route   GET /api/applications/:id
// @access  Private (owner applicant or owning employer)
export const getApplicationById = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id).populate(
    "job",
    "title description companyName"
  );
  if (!application) {
    res.status(404);
    throw new Error("Application not found");
  }
  const isOwner =
    application.applicant.toString() === req.user._id.toString() ||
    application.employer.toString() === req.user._id.toString();
  if (!isOwner) {
    res.status(403);
    throw new Error("Not authorized");
  }
  res.json({ success: true, data: application });
});

// @desc    Get applications for logged-in jobseeker
// @route   GET /api/applications/mine
// @access  Private/Jobseeker
export const getMyApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ applicant: req.user._id })
    .populate("job", "title companyName location jobType status")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: applications });
});

// @desc    Get applications for a specific job (employer view)
// @route   GET /api/applications/job/:jobId
// @access  Private/Employer (owner only)
export const getApplicationsForJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    res.status(404);
    throw new Error("Job not found");
  }
  if (job.employer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to view these applications");
  }

  const applications = await Application.find({ job: job._id })
    .populate("applicant", "name email skills experienceYears resumeUrl location")
    .sort({ "aiScreening.score": -1, createdAt: -1 });

  res.json({ success: true, data: applications });
});

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Private/Employer (owner only)
export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["applied", "shortlisted", "interview", "rejected", "hired"];

  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid status value");
  }

  const application = await Application.findById(req.params.id).populate("job", "title");
  if (!application) {
    res.status(404);
    throw new Error("Application not found");
  }
  if (application.employer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  application.status = status;
  await application.save();

  res.json({ success: true, data: application });

  const applicant = await User.findById(application.applicant);
  if (applicant) {
    notify({
      user: applicant._id,
      type: "status_update",
      title: "Application status updated",
      message: `Your application for "${application.job.title}" is now "${status}".`,
      link: "/applications",
    });
    const template = emailTemplates.statusUpdate(application.job.title, status);
    sendEmail({ to: applicant.email, ...template });
  }
});

// @desc    Start (or resume) the AI interview — returns next question
// @route   POST /api/applications/:id/interview/start
// @access  Private/Jobseeker (owner only)
export const startInterview = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id).populate("job", "title description");
  if (!application) {
    res.status(404);
    throw new Error("Application not found");
  }
  if (application.applicant.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }
  if (application.aiInterview.status === "completed") {
    res.status(400);
    throw new Error("Interview already completed");
  }
  if (application.aiInterview.status === "failed_violation") {
    res.status(400);
    throw new Error("This interview was ended due to a proctoring violation (switching tabs) and cannot be resumed.");
  }

  if (application.aiInterview.transcript.length > 0) {
    const lastQuestion = [...application.aiInterview.transcript]
      .reverse()
      .find((m) => m.role === "assistant");
    return res.json({
      success: true,
      data: { question: lastQuestion?.content, transcript: application.aiInterview.transcript },
    });
  }

  const { question } = await getNextInterviewQuestion({
    jobTitle: application.job.title,
    jobDescription: application.job.description,
    transcript: [],
  });

  application.aiInterview.transcript.push({ role: "assistant", content: question });
  application.aiInterview.status = "in_progress";
  await application.save();

  res.json({ success: true, data: { question, transcript: application.aiInterview.transcript } });
});

// @desc    Submit an answer, get next question or final evaluation
// @route   POST /api/applications/:id/interview/answer
// @access  Private/Jobseeker (owner only)
export const submitInterviewAnswer = asyncHandler(async (req, res) => {
  const { answer } = req.body;
  if (!answer || !answer.trim()) {
    res.status(400);
    throw new Error("Answer cannot be empty");
  }

  const application = await Application.findById(req.params.id).populate("job", "title description");
  if (!application) {
    res.status(404);
    throw new Error("Application not found");
  }
  if (application.applicant.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }
  if (application.aiInterview.status === "completed") {
    res.status(400);
    throw new Error("Interview already completed");
  }
  if (application.aiInterview.status === "failed_violation") {
    res.status(400);
    throw new Error("This interview was ended due to a proctoring violation (switching tabs) and cannot be resumed.");
  }

  application.aiInterview.transcript.push({ role: "user", content: answer });

  const questionsAsked = application.aiInterview.transcript.filter((m) => m.role === "assistant").length;

  if (questionsAsked >= 5) {
    const evaluation = await evaluateInterview({
      jobTitle: application.job.title,
      jobDescription: application.job.description,
      transcript: application.aiInterview.transcript,
    });

    application.aiInterview.status = "completed";
    application.aiInterview.evaluation = {
      score: evaluation.score,
      summary: evaluation.summary,
      strengths: evaluation.strengths || [],
      concerns: evaluation.concerns || [],
      recommendation: evaluation.recommendation || "",
    };
    await application.save();

    return res.json({
      success: true,
      data: { isComplete: true, evaluation: application.aiInterview.evaluation },
    });
  }

  const { question } = await getNextInterviewQuestion({
    jobTitle: application.job.title,
    jobDescription: application.job.description,
    transcript: application.aiInterview.transcript,
  });

  application.aiInterview.transcript.push({ role: "assistant", content: question });
  await application.save();

  res.json({ success: true, data: { isComplete: false, question } });
});

// @desc    Search/filter candidates across all of the employer's jobs
// @route   GET /api/applications/employer/candidates
// @access  Private/Employer
export const searchCandidates = asyncHandler(async (req, res) => {
  const { skills, minExperience, status, jobId } = req.query;

  const jobFilter = { employer: req.user._id };
  if (jobId) jobFilter._id = jobId;
  const employerJobs = await Job.find(jobFilter).select("_id title");
  const jobIds = employerJobs.map((j) => j._id);

  const query = { job: { $in: jobIds } };
  if (status) query.status = status;

  let applications = await Application.find(query)
    .populate("applicant", "name email skills experienceYears location resumeUrl")
    .populate("job", "title")
    .sort({ createdAt: -1 });

  if (skills) {
    const skillList = skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    applications = applications.filter((app) =>
      (app.applicant.skills || []).some((s) => skillList.includes(s.toLowerCase()))
    );
  }

  if (minExperience) {
    const min = Number(minExperience);
    applications = applications.filter((app) => (app.applicant.experienceYears || 0) >= min);
  }

  res.json({ success: true, data: applications, jobs: employerJobs });
});

// @desc    Recruitment analytics for the logged-in employer
// @route   GET /api/applications/employer/analytics
// @access  Private/Employer
export const getEmployerAnalytics = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ employer: req.user._id });
  const jobIds = jobs.map((j) => j._id);

  const applications = await Application.find({ job: { $in: jobIds } });

  const statusBreakdown = {
    applied: 0,
    shortlisted: 0,
    interview: 0,
    rejected: 0,
    hired: 0,
  };
  applications.forEach((app) => {
    statusBreakdown[app.status] = (statusBreakdown[app.status] || 0) + 1;
  });

  // Applications received per day, last 14 days
  const days = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const dailyCounts = Object.fromEntries(days.map((d) => [d, 0]));
  applications.forEach((app) => {
    const day = app.createdAt.toISOString().slice(0, 10);
    if (dailyCounts[day] !== undefined) dailyCounts[day] += 1;
  });

  const topJobs = jobs
    .map((j) => ({ title: j.title, applicationsCount: j.applicationsCount, viewsCount: j.viewsCount }))
    .sort((a, b) => b.applicationsCount - a.applicationsCount)
    .slice(0, 5);

  res.json({
    success: true,
    data: {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j) => j.status === "active").length,
      totalApplications: applications.length,
      totalViews: jobs.reduce((sum, j) => sum + j.viewsCount, 0),
      statusBreakdown,
      applicationsOverTime: days.map((d) => ({ date: d.slice(5), count: dailyCounts[d] })),
      topJobs,
    },
  });
});

// @desc    Report a proctoring violation (tab switch) during the AI interview — ends it immediately as failed
// @route   POST /api/applications/:id/interview/violation
// @access  Private/Jobseeker (owner only)
export const reportInterviewViolation = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) {
    res.status(404);
    throw new Error("Application not found");
  }
  if (application.applicant.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  if (application.aiInterview.status === "in_progress") {
    application.aiInterview.status = "failed_violation";
    await application.save();
  }

  res.json({ success: true, data: { status: "failed_violation" } });
});

// @desc    Start (or resume) the AI-generated MCQ test — returns questions without correct answers
// @route   POST /api/applications/:id/mcq/start
// @access  Private/Jobseeker (owner only)
export const startMCQTest = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id).populate("job", "title description skills");

  if (!application) {
    res.status(404);
    throw new Error("Application not found");
  }

  if (application.applicant.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  // Agar already completed hai toh reject karein
  if (application.mcqTest && ["completed", "failed_violation", "failed_timeout"].includes(application.mcqTest.status)) {
    res.status(400);
    throw new Error("This test has already ended and cannot be retaken.");
  }

  // Agar test already in_progress hai aur questions bane huye hain, toh wahi return karein
  if (application.mcqTest?.status === "in_progress" && application.mcqTest?.questions?.length > 0) {
    const elapsedMs = Date.now() - new Date(application.mcqTest.startedAt).getTime();
    const limitMs = (application.mcqTest.timeLimitMinutes || 15) * 60 * 1000;
    const remainingSeconds = Math.max(0, Math.floor((limitMs - elapsedMs) / 1000));

    return res.json({
      success: true,
      data: {
        questions: application.mcqTest.questions.map((q) => ({
          question: q.question,
          options: q.options,
        })),
        timeLimitMinutes: application.mcqTest.timeLimitMinutes || 15,
        remainingSeconds,
      },
    });
  }

  // Naye questions generate karein (aiService fallback mock de dega agar key nahi hai)
  let generated = [];
  try {
    generated = await generateMCQTest({
      jobTitle: application.job?.title || "Role",
      jobDescription: application.job?.description || "",
      skills: application.job?.skills || [],
    });
  } catch (err) {
    console.error("AI Generation error fallback:", err.message);
    // Hard fallback agar koi bhi error aaye
    generated = [
      {
        question: "What is the primary role of Git in software development?",
        options: ["Code version control", "Database hosting", "Styling websites", "Running tests automatically"],
        correctIndex: 0
      },
      {
        question: "Which HTTP status code indicates a successful resource creation?",
        options: ["200", "201", "404", "500"],
        correctIndex: 1
      },
      {
        question: "Which of the following is used for client-side storage?",
        options: ["localStorage", "Express Router", "Mongoose", "PostgreSQL"],
        correctIndex: 0
      }
    ];
  }

  application.mcqTest = {
    questions: generated,
    status: "in_progress",
    startedAt: new Date(),
    timeLimitMinutes: 15,
  };

  await application.save();

  res.json({
    success: true,
    data: {
      questions: generated.map((q) => ({
        question: q.question,
        options: q.options,
      })),
      timeLimitMinutes: 15,
      remainingSeconds: 15 * 60,
    },
  });
});

// @desc    Submit MCQ answers — auto-graded; score >= 8/10 auto-shortlists the candidate
// @route   POST /api/applications/:id/mcq/submit
// @access  Private/Jobseeker (owner only)
export const submitMCQTest = asyncHandler(async (req, res) => {
  const { answers } = req.body; // array of selected option indices, same order as questions

  const application = await Application.findById(req.params.id)
    .select("+mcqTest.questions.correctIndex")
    .populate("job", "title");
  if (!application) {
    res.status(404);
    throw new Error("Application not found");
  }
  if (application.applicant.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }
  if (application.mcqTest.status !== "in_progress") {
    res.status(400);
    throw new Error("No active test to submit");
  }

  const elapsedMs = Date.now() - new Date(application.mcqTest.startedAt).getTime();
  const limitMs = application.mcqTest.timeLimitMinutes * 60 * 1000;
  const timedOut = elapsedMs > limitMs + 5000; // small grace period for network latency

  const safeAnswers = application.mcqTest.questions.map((_, i) =>
    typeof answers?.[i] === "number" ? answers[i] : -1
  );

  const score = application.mcqTest.questions.reduce(
    (total, q, i) => total + (safeAnswers[i] === q.correctIndex ? 1 : 0),
    0
  );

  application.mcqTest.answers = safeAnswers;
  application.mcqTest.score = score;
  application.mcqTest.submittedAt = new Date();
  application.mcqTest.status = timedOut ? "failed_timeout" : "completed";

// 80% passing rule (8/10 ya usse zyada)
  const isPassed = !timedOut && score >= 8;

  if (isPassed) {
    application.status = "applied";
    application.mcqTest.autoShortlisted = true;
    await application.save();

    // Employer notification
    if (application.job) {
      notify({
        user: application.job.employer,
        type: "status_update",
        title: "Candidate passed assessment",
        message: `A candidate scored ${score}/10 on the screening test for "${application.job.title}".`,
        link: `/employer/jobs/${application.job._id}/applicants`,
      });
    }

    return res.json({
      success: true,
      passed: true,
      message: "Congratulations! Aapne test clear kar liya hai aur aapki application submit ho gayi hai.",
      data: {
        score,
        total: application.mcqTest.questions.length,
        status: application.status,
        autoShortlisted: true,
      },
    });
  } else {
    // 8 se kam score hone par reject aur fail message
    application.status = "rejected";
    application.mcqTest.autoShortlisted = false;
    await application.save();

    return res.json({
      success: false,
      passed: false,
      message: "Sorry, aap test clear nahi kar paye. Better luck next time!",
      data: {
        score,
        total: application.mcqTest.questions.length,
        status: "rejected",
        autoShortlisted: false,
      },
    });
  }
});

// @desc    Report a proctoring violation (tab switch) during the MCQ test — ends it immediately as failed
// @route   POST /api/applications/:id/mcq/violation
// @access  Private/Jobseeker (owner only)
export const reportMCQViolation = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) {
    res.status(404);
    throw new Error("Application not found");
  }
  if (application.applicant.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  if (application.mcqTest.status === "in_progress") {
    application.mcqTest.status = "failed_violation";
    await application.save();
  }

  res.json({ success: true, data: { status: "failed_violation" } });
});
