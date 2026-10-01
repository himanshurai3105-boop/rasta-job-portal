import express from "express";
import {
  applyToJob,
  getApplicationById,
  getMyApplications,
  getApplicationsForJob,
  updateApplicationStatus,
  startInterview,
  submitInterviewAnswer,
  reportInterviewViolation,
  startMCQTest,
  submitMCQTest,
  reportMCQViolation,
  searchCandidates,
  getEmployerAnalytics,
} from "../controllers/applicationController.js";
import { protect, authorize } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import { applyValidator, updateStatusValidator, jobIdParamValidator, mongoIdParamValidator } from "../middleware/validators.js";
import uploadResume from "../middleware/uploadResume.js";

const router = express.Router();

router.post(
  "/:jobId",
  protect,
  authorize("jobseeker"),
  writeLimiter,
  uploadResume.single("resume"),
  applyValidator,
  validate,
  applyToJob
);
router.get("/mine", protect, authorize("jobseeker"), getMyApplications);
router.get("/employer/candidates", protect, authorize("employer"), searchCandidates);
router.get("/employer/analytics", protect, authorize("employer"), getEmployerAnalytics);
router.get(
  "/job/:jobId",
  protect,
  authorize("employer"),
  jobIdParamValidator,
  validate,
  getApplicationsForJob
);
router.get("/:id", protect, mongoIdParamValidator, validate, getApplicationById);
router.put(
  "/:id/status",
  protect,
  authorize("employer"),
  updateStatusValidator,
  validate,
  updateApplicationStatus
);

router.post("/:id/interview/start", protect, authorize("jobseeker"), mongoIdParamValidator, validate, startInterview);
router.post("/:id/interview/answer", protect, authorize("jobseeker"), mongoIdParamValidator, validate, submitInterviewAnswer);
router.post("/:id/interview/violation", protect, authorize("jobseeker"), mongoIdParamValidator, validate, reportInterviewViolation);

router.post("/:id/mcq/start", protect, authorize("jobseeker"), mongoIdParamValidator, validate, startMCQTest);
router.post("/:id/mcq/submit", protect, authorize("jobseeker"), mongoIdParamValidator, validate, submitMCQTest);
router.post("/:id/mcq/violation", protect, authorize("jobseeker"), mongoIdParamValidator, validate, reportMCQViolation);

export default router;
