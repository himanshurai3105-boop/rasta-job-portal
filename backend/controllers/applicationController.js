import asyncHandler from "express-async-handler";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { sendEmail, emailTemplates } from "../utils/emailService.js";
import { notify } from "../utils/notify.js";
import { extractResumeText } from "../utils/resumeParser.js";
import { screenResume, getNextInterviewQuestion, evaluateInterview, generateMCQTest } from "../utils/aiService.js";

// @desc    Apply to a job (with resume upload) -> Screens Resume -> Auto triggers test eligibility
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

  // Initial resume screening score (Threshold: 70%)
  let aiScreeningData = {
    score: null,
    summary: "",
    strengths: [],
    gaps: [],
    status: resumeText ? "pending" : "skipped",
  };

  if (resumeText) {
    try {
      const result = await screenResume({
        jobTitle: job.title,
        jobDescription: job.description,
        jobRequirements: job.requirements,
        resumeText,
      });

      aiScreeningData = {
        score: result.score,
        summary: result.summary || "",
        strengths: result.strengths || [],
        gaps: result.gaps || [],
        status: "completed",
      };
    } catch (err) {
      aiScreeningData.status = "failed";
      console.error("AI screening failed:", err.message);
    }
  }

  const application = await Application.create({
    job: job._id,
    applicant: req.user._id,
    employer: job.employer,
    coverLetter: req.body.coverLetter || "",
    resumeUrl: resumeUrl || req.user.resumeUrl || "",
    resumeText,
    status: "applied",
    aiScreening: aiScreeningData,
    mcqTest: {
      questions: [],
      answers: [],
      score: null,
      timeLimitMinutes: 10,
      status: "not_started",
      autoShortlisted: false,
    },
  });

  job.applicationsCount += 1;
  await job.save();

  // Return application with test target URL
  res.status(201).json({
    success: true,
    data: application,
    testUrl: `/mcq-test/${application._id}`,
    message: "Application submitted. Proceed directly to the 10-minute assessment test.",
  });

  // Employer notification
  const employer = await User.findById(job.employer);
  if (employer) {
    notify({
      user: employer._id,
      type: "new_applicant",
      title: "New applicant received",
      message: `${req.user.name} applied to "${job.title}".`,
      link: `/employer/jobs/${job._id}/applicants`,
    });
    if (emailTemplates?.newApplicant) {
      const template = emailTemplates.newApplicant(job.title, req.user.name);
      sendEmail({ to: employer.email, ...template });
    }
  }
});

// @desc    Get single application
// @route   GET /api/applications/:id
// @access  Private
export const getApplicationById = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate("job", "title description companyName")
    .populate("applicant", "name email phone");

  if (!application) {
    res.status(404);
    throw new Error("Application not found");
  }
  const isOwner =
    application.applicant?._id?.toString() === req.user._id.toString() ||
    application.employer?._id?.toString() === req.user._id.toString() ||
    application.applicant?.toString() === req.user._id.toString() ||
    application.employer?.toString() === req.user._id.toString();

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

  // Standard safe array response
  res.json({ success: true, data: applications, applications });
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
    if (emailTemplates?.statusUpdate) {
      const template = emailTemplates.statusUpdate(application.job.title, status);
      sendEmail({ to: applicant.email, ...template });
    }
  }
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
  if (["completed", "failed_violation", "failed_timeout"].includes(application.mcqTest.status)) {
    res.status(400);
    throw new Error("This test has already ended and cannot be retaken.");
  }

  if (application.mcqTest.status === "in_progress" && application.mcqTest.questions.length > 0) {
    const elapsedMs = Date.now() - new Date(application.mcqTest.startedAt).getTime();
    const remainingMs = application.mcqTest.timeLimitMinutes * 60 * 1000 - elapsedMs;
    return res.json({
      success: true,
      data: {
        jobTitle: application.job?.title,
        questions: application.mcqTest.questions.map((q) => ({ question: q.question, options: q.options })),
        timeLimitMinutes: application.mcqTest.timeLimitMinutes,
        remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
      },
    });
  }

  // Generate 10 role-tailored questions via Gemini
  const generated = await generateMCQTest({
    jobTitle: application.job.title,
    jobDescription: application.job.description,
    skills: application.job.skills,
  });

  application.mcqTest.questions = generated;
  application.mcqTest.status = "in_progress";
  application.mcqTest.startedAt = new Date();
  await application.save();

  res.json({
    success: true,
    data: {
      jobTitle: application.job?.title,
      questions: generated.map((q) => ({ question: q.question, options: q.options })),
      timeLimitMinutes: application.mcqTest.timeLimitMinutes,
      remainingSeconds: application.mcqTest.timeLimitMinutes * 60,
    },
  });
});

// @desc    Submit MCQ answers — Strict 80% (8/10) threshold + 70% Resume check
// @route   POST /api/applications/:id/mcq/submit
// @access  Private/Jobseeker (owner only)
export const submitMCQTest = asyncHandler(async (req, res) => {
  const { answers } = req.body;

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
  if (application.mcqTest.status === "failed_violation") {
    res.status(400);
    throw new Error("Disqualified due to anti-cheating tab switch violation.");
  }
  if (application.mcqTest.status !== "in_progress") {
    res.status(400);
    throw new Error("No active test to submit");
  }

  const elapsedMs = Date.now() - new Date(application.mcqTest.startedAt).getTime();
  const limitMs = application.mcqTest.timeLimitMinutes * 60 * 1000;
  const timedOut = elapsedMs > limitMs + 5000; // 5 sec network grace period

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

  // Strict Thresholds:
  const testPassed = !timedOut && score >= 8; // Exactly 80% (8 out of 10)
  const resumePassed = (application.aiScreening?.score || 0) >= 70; // 70% AI resume cutoff

  if (testPassed && resumePassed) {
    // Top Tier: Auto-shortlisted for direct interview
    application.mcqTest.autoShortlisted = true;
    application.status = "shortlisted";

    notify({
      user: application.employer,
      type: "status_update",
      title: "Top Candidate Auto-Shortlisted!",
      message: `A candidate scored ${score}/10 on the test and ${application.aiScreening.score}% on resume screening for "${application.job.title}".`,
      link: `/employer/jobs/${application.job._id}/applicants`,
    });
  } else if (resumePassed && !testPassed) {
    // Tier 2: Shortlisted Resume Pool (Company can review)
    application.mcqTest.autoShortlisted = false;
    application.status = "applied";
  } else {
    // Under 80% test and low resume match -> Direct Rejected
    application.mcqTest.autoShortlisted = false;
    application.status = "rejected";
  }

  await application.save();

  res.json({
    success: true,
    data: {
      score,
      total: application.mcqTest.questions.length,
      status: application.status,
      testPassed,
      resumeScore: application.aiScreening?.score,
      autoShortlisted: application.mcqTest.autoShortlisted,
      message: (testPassed && resumePassed)
        ? "Congratulations! You cleared both Resume Screening (70%+) and Technical Test (80%+). Your application has been shortlisted!"
        : resumePassed
        ? "Your resume was shortlisted (70%+), but you scored under 80% on the test. Your application is saved in the company's review pool."
        : "Sorry, you can't qualify the test. A minimum of 80% (8/10) is required.",
    },
  });
});

// @desc    Anti-Cheating Proctoring Violation (Instant Disqualification)
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
    application.mcqTest.score = 0;
    application.mcqTest.autoShortlisted = false;
    application.status = "rejected"; // Immediate reject on cheating
    await application.save();
  }

  res.json({ 
    success: false, 
    data: { 
      status: "rejected", 
      message: "Test terminated: Switching tabs or windows is strictly prohibited. Your application has been rejected." 
    } 
  });
});

// AI Interview Handlers
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
    throw new Error("This interview was ended due to a proctoring violation.");
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
      (app.applicant?.skills || []).some((s) => skillList.includes(s.toLowerCase()))
    );
  }

  if (minExperience) {
    const min = Number(minExperience);
    applications = applications.filter((app) => (app.applicant?.experienceYears || 0) >= min);
  }

  res.json({ success: true, data: applications, jobs: employerJobs });
});

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