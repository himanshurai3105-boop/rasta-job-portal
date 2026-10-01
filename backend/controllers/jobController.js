import asyncHandler from "express-async-handler";
import Job from "../models/Job.js";
import User from "../models/User.js";

// @desc    Get all jobs (with search, filters, pagination)
// @route   GET /api/jobs
// @access  Public
export const getJobs = asyncHandler(async (req, res) => {
  const {
    keyword,
    location,
    jobType,
    workMode,
    experienceLevel,
    category,
    salaryMin,
    salaryMax,
    skills,
    page = 1,
    limit = 10,
  } = req.query;

  const query = { status: "active" };

  if (keyword) {
    const kwRegex = new RegExp(keyword, "i");
    query.$or = [{ title: kwRegex }, { companyName: kwRegex }, { skills: kwRegex }, { description: kwRegex }];
  }
  if (location) query.location = { $regex: location, $options: "i" };
  if (jobType) query.jobType = jobType;
  if (workMode) query.workMode = workMode;
  if (experienceLevel) query.experienceLevel = experienceLevel;
  if (category) query.category = category;

  // A job matches the salary filter if its range overlaps the requested range
  if (salaryMin) query.salaryMax = { $gte: Number(salaryMin) };
  if (salaryMax) query.salaryMin = { $lte: Number(salaryMax) };

  if (skills) {
    const skillList = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (skillList.length > 0) {
      query.skills = { $in: skillList.map((s) => new RegExp(s, "i")) };
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .sort({ isUrgent: -1, isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("employer", "companyName companyLogoUrl"),
    Job.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: jobs,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// @desc    Get single job by slug
// @route   GET /api/jobs/:slug
// @access  Public
export const getJobBySlug = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ slug: req.params.slug }).populate(
    "employer",
    "companyName companyLogoUrl companyWebsite companyDescription"
  );

  if (!job) {
    res.status(404);
    throw new Error("Job not found");
  }

  job.viewsCount += 1;
  await job.save();

  res.json({ success: true, data: job });
});

// @desc    Create job
// @route   POST /api/jobs
// @access  Private/Employer
export const createJob = asyncHandler(async (req, res) => {
  const job = await Job.create({
    ...req.body,
    employer: req.user._id,
    companyName: req.body.companyName || req.user.companyName,
    companyLogoUrl: req.user.companyLogoUrl,
  });

  res.status(201).json({ success: true, data: job });
});

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private/Employer (owner only)
export const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error("Job not found");
  }
  if (job.employer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to edit this job");
  }

  Object.assign(job, req.body);
  await job.save();

  res.json({ success: true, data: job });
});

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private/Employer (owner only) or Admin
export const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error("Job not found");
  }
  if (
    job.employer.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Not authorized to delete this job");
  }

  await job.deleteOne();
  res.json({ success: true, message: "Job removed" });
});

// @desc    Get jobs posted by logged-in employer
// @route   GET /api/jobs/employer/mine
// @access  Private/Employer
export const getMyJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ employer: req.user._id }).sort({
    createdAt: -1,
  });
  res.json({ success: true, data: jobs });
});

// @desc    Save or unsave a job (toggle)
// @route   POST /api/jobs/:id/save
// @access  Private/Jobseeker
export const toggleSaveJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404);
    throw new Error("Job not found");
  }

  const user = await User.findById(req.user._id);
  const alreadySaved = user.savedJobs.some((id) => id.toString() === job._id.toString());

  if (alreadySaved) {
    user.savedJobs = user.savedJobs.filter((id) => id.toString() !== job._id.toString());
  } else {
    user.savedJobs.push(job._id);
  }
  await user.save();

  res.json({ success: true, data: { saved: !alreadySaved } });
});

// @desc    Get logged-in jobseeker's saved jobs
// @route   GET /api/jobs/saved/mine
// @access  Private/Jobseeker
export const getSavedJobs = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "savedJobs",
    populate: { path: "employer", select: "companyName companyLogoUrl" },
  });
  res.json({ success: true, data: user.savedJobs });
});

// @desc    Get jobs recommended for the logged-in jobseeker, based on skill overlap
// @route   GET /api/jobs/recommended/mine
// @access  Private/Jobseeker
export const getRecommendedJobs = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user.skills || user.skills.length === 0) {
    return res.json({ success: true, data: [], message: "Add skills to your profile to get recommendations." });
  }

  const skillPatterns = user.skills.map((s) => new RegExp(s, "i"));

  const candidates = await Job.find({
    status: "active",
    skills: { $in: skillPatterns },
  })
    .populate("employer", "companyName companyLogoUrl")
    .limit(150); // cap the candidate pool before scoring

  const preferredLocations = (user.preferredLocations || []).map((l) => l.toLowerCase());

  const scored = candidates
    .map((job) => {
      let score = job.skills.filter((skill) =>
        user.skills.some((us) => us.toLowerCase() === skill.toLowerCase())
      ).length;

      // Boost for matching job preferences — skills remain the primary signal
      if (user.desiredRole && job.title.toLowerCase().includes(user.desiredRole.toLowerCase())) {
        score += 2;
      }
      if (preferredLocations.some((loc) => job.location.toLowerCase().includes(loc))) {
        score += 1;
      }
      if (user.preferredJobTypes?.includes(job.jobType)) {
        score += 1;
      }
      if (user.preferredWorkModes?.includes(job.workMode)) {
        score += 1;
      }

      return { job, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((s) => s.job);

  res.json({ success: true, data: scored });
});

// @desc    Get a company's public profile + their active job listings
// @route   GET /api/jobs/company/:employerId
// @access  Public
export const getCompanyProfile = asyncHandler(async (req, res) => {
  const employer = await User.findOne({ _id: req.params.employerId, role: "employer" }).select(
    "companyName companyLogoUrl companyWebsite companyDescription isVerified createdAt"
  );

  if (!employer) {
    res.status(404);
    throw new Error("Company not found");
  }

  const jobs = await Job.find({ employer: employer._id, status: "active" }).sort({ createdAt: -1 });

  res.json({ success: true, data: { company: employer, jobs } });
});

// @desc    Autocomplete suggestions for job titles and skills, based on real active listings
// @route   GET /api/jobs/suggestions?q=react
// @access  Public
export const getSearchSuggestions = asyncHandler(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 2) {
    return res.json({ success: true, data: { titles: [], skills: [], locations: [], companies: [] } });
  }

  const regex = new RegExp(q, "i");

  const matchingJobs = await Job.find({
    status: "active",
    $or: [{ title: regex }, { skills: regex }, { location: regex }, { companyName: regex }],
  })
    .select("title skills location companyName employer")
    .limit(50);

  const titleSet = new Set();
  const skillSet = new Set();
  const locationSet = new Set();
  const companySet = new Map(); // name -> employerId, deduped

  matchingJobs.forEach((job) => {
    if (regex.test(job.title)) titleSet.add(job.title);
    if (regex.test(job.location)) locationSet.add(job.location);
    if (regex.test(job.companyName)) companySet.set(job.companyName, job.employer?.toString());
    (job.skills || []).forEach((s) => {
      if (regex.test(s)) skillSet.add(s);
    });
  });

  res.json({
    success: true,
    data: {
      titles: [...titleSet].slice(0, 6),
      skills: [...skillSet].slice(0, 6),
      locations: [...locationSet].slice(0, 6),
      companies: [...companySet.entries()].slice(0, 6).map(([name, employerId]) => ({ name, employerId })),
    },
  });
});

// @desc    Aggregated salary insights across active listings
// @route   GET /api/jobs/salary-insights
// @access  Public
export const getSalaryInsights = asyncHandler(async (req, res) => {
  const baseMatch = { status: "active", salaryMin: { $gt: 0 }, salaryMax: { $gt: 0 } };

  const [overall, byExperience, byJobType, topLocations, topTitles] = await Promise.all([
    Job.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          avgMin: { $avg: "$salaryMin" },
          avgMax: { $avg: "$salaryMax" },
          count: { $sum: 1 },
        },
      },
    ]),
    Job.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$experienceLevel",
          avgSalary: { $avg: { $avg: ["$salaryMin", "$salaryMax"] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgSalary: 1 } },
    ]),
    Job.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$jobType",
          avgSalary: { $avg: { $avg: ["$salaryMin", "$salaryMax"] } },
          count: { $sum: 1 },
        },
      },
    ]),
    Job.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$location",
          avgSalary: { $avg: { $avg: ["$salaryMin", "$salaryMax"] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Job.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$title",
          avgSalary: { $avg: { $avg: ["$salaryMin", "$salaryMax"] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      overall: overall[0] || { avgMin: 0, avgMax: 0, count: 0 },
      byExperience: byExperience.map((r) => ({ level: r._id, avgSalary: Math.round(r.avgSalary), count: r.count })),
      byJobType: byJobType.map((r) => ({ type: r._id, avgSalary: Math.round(r.avgSalary), count: r.count })),
      topLocations: topLocations.map((r) => ({ location: r._id, avgSalary: Math.round(r.avgSalary), count: r.count })),
      topTitles: topTitles.map((r) => ({ title: r._id, avgSalary: Math.round(r.avgSalary), count: r.count })),
    },
  });
});

// @desc    Get featured/urgent jobs for homepage highlight
// @route   GET /api/jobs/featured
// @access  Public
export const getFeaturedJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find({
    status: "active",
    $or: [{ isFeatured: true }, { isUrgent: true }],
  })
    .populate("employer", "companyName companyLogoUrl")
    .sort({ isUrgent: -1, isFeatured: -1, createdAt: -1 })
    .limit(6);

  res.json({ success: true, data: jobs });
});
