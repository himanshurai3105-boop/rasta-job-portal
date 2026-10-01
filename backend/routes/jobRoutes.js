import express from "express";
import {
  getJobs,
  getJobBySlug,
  createJob,
  updateJob,
  deleteJob,
  getMyJobs,
  toggleSaveJob,
  getSavedJobs,
  getRecommendedJobs,
  getCompanyProfile,
  getSearchSuggestions,
  getSalaryInsights,
  getFeaturedJobs,
} from "../controllers/jobController.js";
import { protect, authorize } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import {
  createJobValidator,
  updateJobValidator,
  jobIdValidator,
  jobQueryValidator,
} from "../middleware/validators.js";

const router = express.Router();

// IMPORTANT: specific routes must come before the "/:slug" catch-all
router.get("/", jobQueryValidator, validate, getJobs);
router.get("/suggestions", getSearchSuggestions);
router.get("/salary-insights", getSalaryInsights);
router.get("/featured", getFeaturedJobs);
router.get("/employer/mine", protect, authorize("employer"), getMyJobs);
router.get("/saved/mine", protect, authorize("jobseeker"), getSavedJobs);
router.get("/recommended/mine", protect, authorize("jobseeker"), getRecommendedJobs);
router.get("/company/:employerId", getCompanyProfile);
router.post("/", protect, authorize("employer"), writeLimiter, createJobValidator, validate, createJob);
router.post("/:id/save", protect, authorize("jobseeker"), jobIdValidator, validate, toggleSaveJob);
router.put(
  "/:id",
  protect,
  authorize("employer", "admin"),
  updateJobValidator,
  validate,
  updateJob
);
router.delete("/:id", protect, authorize("employer", "admin"), jobIdValidator, validate, deleteJob);

// Catch-all — must stay last among GET routes
router.get("/:slug", getJobBySlug);

export default router;
