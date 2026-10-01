import express from "express";
import {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  uploadProfileResume,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect, authorize } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import {
  registerValidator,
  loginValidator,
  updateMeValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from "../middleware/validators.js";
import uploadResume from "../middleware/uploadResume.js";

const router = express.Router();

router.post("/register", authLimiter, registerValidator, validate, registerUser);
router.post("/login", authLimiter, loginValidator, validate, loginUser);
router.post("/forgot-password", authLimiter, forgotPasswordValidator, validate, forgotPassword);
router.post("/reset-password/:token", authLimiter, resetPasswordValidator, validate, resetPassword);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMeValidator, validate, updateMe);
router.post(
  "/me/resume",
  protect,
  authorize("jobseeker"),
  uploadResume.single("resume"),
  uploadProfileResume
);

export default router;
