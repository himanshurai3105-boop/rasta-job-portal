import asyncHandler from "express-async-handler";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { analyzeJobFit } from "../utils/jobFitService.js";

// @desc    Check how well the logged-in jobseeker fits a job (profile vs requirements + company rules)
// @route   POST /api/jobs/:id/fit
// @access  Private/Jobseeker
export const getJobFit = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job || job.status !== "active") {
    res.status(404);
    throw new Error("Job not found or no longer accepting applications");
  }

  const userDoc = await User.findById(req.user._id);
  const user = userDoc.toObject();

  const result = await analyzeJobFit({ job: job.toObject(), user });
  res.json({ success: true, data: result });
});