import asyncHandler from "express-async-handler";
import crypto from "crypto";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { sendEmail, emailTemplates } from "../utils/emailService.js";
import { notify } from "../utils/notify.js";

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, companyName } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email and password");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists with this email");
  }

  if (role === "employer" && !companyName) {
    res.status(400);
    throw new Error("Company name is required for employer accounts");
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role === "employer" ? "employer" : "jobseeker", // admin can't self-register
    companyName: companyName || "",
  });

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyName: user.companyName,
      token: generateToken(user._id, user.role),
    },
  });

  // Fire-and-forget — don't block the response on email/notification
  const welcome = emailTemplates.welcome(user.name);
  sendEmail({ to: user.email, ...welcome });
  notify({
    user: user._id,
    type: "welcome",
    title: "Welcome to rasta",
    message:
      user.role === "employer"
        ? "Post your first job to start receiving applicants."
        : "Browse openings and apply to roles that match your skills.",
    link: user.role === "employer" ? "/employer/post" : "/jobs",
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (user.isBlocked) {
    res.status(403);
    throw new Error("Your account has been blocked. Contact support.");
  }

  res.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyName: user.companyName,
      token: generateToken(user._id, user.role),
    },
  });
});

// @desc    Get logged-in user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

// @desc    Update profile
// @route   PUT /api/auth/me
// @access  Private
export const updateMe = asyncHandler(async (req, res) => {
  const allowedFields = [
    "name",
    "phone",
    "headline",
    "skills",
    "resumeUrl",
    "experienceYears",
    "location",
    "desiredRole",
    "preferredLocations",
    "preferredJobTypes",
    "preferredWorkModes",
    "companyName",
    "companyLogoUrl",
    "companyWebsite",
    "companyDescription",
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  // Email is handled separately — it needs a uniqueness check against other users
  if (req.body.email !== undefined) {
    const newEmail = req.body.email.trim().toLowerCase();
    if (newEmail !== req.user.email) {
      const emailTaken = await User.findOne({ email: newEmail, _id: { $ne: req.user._id } });
      if (emailTaken) {
        res.status(400);
        throw new Error("That email is already in use by another account");
      }
      updates.email = newEmail;
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, data: user });
});

// @desc    Upload/replace resume file on profile
// @route   POST /api/auth/me/resume
// @access  Private/Jobseeker
export const uploadProfileResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  const resumeUrl = `/uploads/resumes/${req.file.filename}`;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { resumeUrl },
    { new: true }
  );

  res.json({ success: true, data: user });
});

// @desc    Request a password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const user = await User.findOne({ email });

  // Always respond the same way, whether or not the account exists —
  // this avoids leaking which emails are registered.
  const genericResponse = {
    success: true,
    message: "If an account exists for that email, a reset link has been sent.",
  };

  if (!user) {
    return res.json(genericResponse);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password/${rawToken}`;
  const template = emailTemplates.passwordReset(resetUrl);

  const result = await sendEmail({ to: user.email, ...template });

  // In dev, if email isn't configured, surface the link so testing isn't blocked
  if (!result.sent && process.env.NODE_ENV !== "production") {
    console.log(`[password reset link] ${resetUrl}`);
    return res.json({ ...genericResponse, devResetUrl: resetUrl });
  }

  res.json(genericResponse);
});

// @desc    Reset password using a token from the reset email
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpire");

  if (!user) {
    res.status(400);
    throw new Error("This reset link is invalid or has expired. Please request a new one.");
  }

  user.password = password; // pre-save hook hashes it
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({ success: true, message: "Password updated — you can now log in." });
});
