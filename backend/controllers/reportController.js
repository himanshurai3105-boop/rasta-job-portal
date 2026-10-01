import asyncHandler from "express-async-handler";
import Report from "../models/Report.js";
import Job from "../models/Job.js";
import User from "../models/User.js";

// @desc    Report a job or a user
// @route   POST /api/reports
// @access  Private (any logged-in user)
export const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, description } = req.body;

  if (targetType === "job") {
    const job = await Job.findById(targetId);
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }
  } else if (targetType === "user") {
    const user = await User.findById(targetId);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
  }

  const report = await Report.create({
    reporter: req.user._id,
    targetType,
    targetJob: targetType === "job" ? targetId : undefined,
    targetUser: targetType === "user" ? targetId : undefined,
    reason,
    description: description || "",
  });

  res.status(201).json({ success: true, data: report });
});
