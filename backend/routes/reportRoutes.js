import express from "express";
import { body } from "express-validator";
import { createReport } from "../controllers/reportController.js";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { writeLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

const createReportValidator = [
  body("targetType").isIn(["job", "user"]).withMessage("Invalid report target type"),
  body("targetId").isMongoId().withMessage("Invalid target id"),
  body("reason")
    .isIn(["spam", "misleading", "inappropriate", "scam", "other"])
    .withMessage("Invalid reason"),
  body("description").optional().trim().isLength({ max: 1000 }),
];

router.post("/", protect, writeLimiter, createReportValidator, validate, createReport);

export default router;
