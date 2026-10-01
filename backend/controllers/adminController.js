import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Report from "../models/Report.js";

// @desc    Dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalJobseekers,
    totalEmployers,
    totalJobs,
    activeJobs,
    totalApplications,
    pendingReports,
    verifiedCompanies,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "jobseeker" }),
    User.countDocuments({ role: "employer" }),
    Job.countDocuments(),
    Job.countDocuments({ status: "active" }),
    Application.countDocuments(),
    Report.countDocuments({ status: "pending" }),
    User.countDocuments({ role: "employer", isVerified: true }),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalJobseekers,
      totalEmployers,
      totalJobs,
      activeJobs,
      totalApplications,
      pendingReports,
      verifiedCompanies,
    },
  });
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

// @desc    Block/unblock a user
// @route   PUT /api/admin/users/:id/block
// @access  Private/Admin
export const toggleBlockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  user.isBlocked = !user.isBlocked;
  await user.save();
  res.json({ success: true, data: user });
});

// @desc    Get all jobs (moderation)
// @route   GET /api/admin/jobs
// @access  Private/Admin
export const getAllJobsAdmin = asyncHandler(async (req, res) => {
  const jobs = await Job.find()
    .populate("employer", "companyName email")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: jobs });
});

// @desc    Update job status (approve/close)
// @route   PUT /api/admin/jobs/:id/status
// @access  Private/Admin
export const updateJobStatusAdmin = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404);
    throw new Error("Job not found");
  }
  job.status = status;
  await job.save();
  res.json({ success: true, data: job });
});

// @desc    Permanently delete a user account
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUserAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (user.role === "admin") {
    res.status(400);
    throw new Error("Admin accounts cannot be deleted from here");
  }
  await user.deleteOne();
  res.json({ success: true, message: "User account deleted" });
});

// @desc    Get all companies (employers) with job counts and verification status
// @route   GET /api/admin/companies
// @access  Private/Admin
export const getCompanies = asyncHandler(async (req, res) => {
  const employers = await User.find({ role: "employer" })
    .select("name email companyName companyWebsite isVerified isBlocked createdAt")
    .sort({ createdAt: -1 });

  const employerIds = employers.map((e) => e._id);
  const jobCounts = await Job.aggregate([
    { $match: { employer: { $in: employerIds } } },
    { $group: { _id: "$employer", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(jobCounts.map((c) => [c._id.toString(), c.count]));

  const companies = employers.map((e) => ({
    ...e.toObject(),
    jobCount: countMap[e._id.toString()] || 0,
  }));

  res.json({ success: true, data: companies });
});

// @desc    Toggle verification badge on a company (employer)
// @route   PUT /api/admin/companies/:id/verify
// @access  Private/Admin
export const toggleVerifyCompany = asyncHandler(async (req, res) => {
  const employer = await User.findOne({ _id: req.params.id, role: "employer" });
  if (!employer) {
    res.status(404);
    throw new Error("Company not found");
  }
  employer.isVerified = !employer.isVerified;
  await employer.save();
  res.json({ success: true, data: employer });
});

// @desc    Get all applications across the platform (admin oversight)
// @route   GET /api/admin/applications
// @access  Private/Admin
export const getAllApplicationsAdmin = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [applications, total] = await Promise.all([
    Application.find(query)
      .populate("applicant", "name email")
      .populate("job", "title companyName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Application.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: applications,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
  });
});

// @desc    Get all reports (admin moderation queue)
// @route   GET /api/admin/reports
// @access  Private/Admin
export const getReportsAdmin = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = {};
  if (status) query.status = status;

  const reports = await Report.find(query)
    .populate("reporter", "name email")
    .populate("targetJob", "title slug status")
    .populate("targetUser", "name email role isBlocked")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: reports });
});

// @desc    Resolve or dismiss a report
// @route   PUT /api/admin/reports/:id
// @access  Private/Admin
export const updateReportStatusAdmin = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const report = await Report.findById(req.params.id);
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }
  report.status = status;
  await report.save();
  res.json({ success: true, data: report });
});
