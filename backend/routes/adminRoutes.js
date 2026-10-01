import express from "express";
import { body } from "express-validator";
import {
  getStats,
  getAllUsers,
  toggleBlockUser,
  deleteUserAdmin,
  getAllJobsAdmin,
  updateJobStatusAdmin,
  getCompanies,
  toggleVerifyCompany,
  getAllApplicationsAdmin,
  getReportsAdmin,
  updateReportStatusAdmin,
} from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { mongoIdParamValidator } from "../middleware/validators.js";

const router = express.Router();

router.use(protect, authorize("admin"));

const jobStatusValidator = [
  ...mongoIdParamValidator,
  body("status").isIn(["active", "closed", "pending_review"]).withMessage("Invalid status value"),
];

const reportStatusValidator = [
  ...mongoIdParamValidator,
  body("status").isIn(["pending", "resolved", "dismissed"]).withMessage("Invalid status value"),
];

router.get("/stats", getStats);

router.get("/users", getAllUsers);
router.put("/users/:id/block", mongoIdParamValidator, validate, toggleBlockUser);
router.delete("/users/:id", mongoIdParamValidator, validate, deleteUserAdmin);

router.get("/companies", getCompanies);
router.put("/companies/:id/verify", mongoIdParamValidator, validate, toggleVerifyCompany);

router.get("/jobs", getAllJobsAdmin);
router.put("/jobs/:id/status", jobStatusValidator, validate, updateJobStatusAdmin);

router.get("/applications", getAllApplicationsAdmin);

router.get("/reports", getReportsAdmin);
router.put("/reports/:id", reportStatusValidator, validate, updateReportStatusAdmin);

export default router;
