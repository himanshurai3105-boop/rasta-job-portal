import { body, param, query } from "express-validator";
import { INDUSTRIES } from "../utils/industries.js";

const EDUCATION_LEVELS = ["10th", "12th", "graduation", "masters", "phd"];

// ---------- Auth ----------
export const registerValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 60 })
    .withMessage("Name must be between 2 and 60 characters"),
  body("email").trim().isEmail().withMessage("Enter a valid email address").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Za-z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),
  body("role")
    .optional()
    .isIn(["jobseeker", "employer"])
    .withMessage("Role must be jobseeker or employer"),
  body("companyName")
    .if(body("role").equals("employer"))
    .trim()
    .notEmpty()
    .withMessage("Company name is required for employer accounts")
    .isLength({ max: 100 }),
];

export const loginValidator = [
  body("email").trim().isEmail().withMessage("Enter a valid email address").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordValidator = [
  body("email").trim().isEmail().withMessage("Enter a valid email address").normalizeEmail(),
];

export const resetPasswordValidator = [
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Za-z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),
];

// Graduation / Masters / PhD ke fields
const higherEducationRules = (level) => [
  body(`education.${level}.degree`).optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body(`education.${level}.stream`).optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body(`education.${level}.percentage`).optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }),
  body(`education.${level}.yearOfPassing`).optional({ checkFalsy: true }).isInt({ min: 1960, max: 2040 }),
  body(`education.${level}.institution`).optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  body(`education.${level}.institutionCode`).optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
];

export const updateMeValidator = [
  body("name").optional().trim().isLength({ min: 2, max: 60 }),
  body("email").optional().trim().isEmail().withMessage("Enter a valid email address").normalizeEmail(),
  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage("Enter a valid phone number"),
  body("headline").optional().trim().isLength({ max: 150 }),
  body("skills").optional().isArray({ max: 30 }).withMessage("Skills must be a list"),
  body("skills.*").optional().trim().isLength({ max: 40 }),

  // Experience: years decimal ho sakta hai (8 months = 0.7)
  body("experienceYears").optional().isFloat({ min: 0, max: 60 }),
  body("experienceMonths").optional().isInt({ min: 0, max: 720 }),
  body("experienceStatus").optional({ checkFalsy: true }).isIn(["fresher", "experienced"]),

  body("location").optional().trim().isLength({ max: 200 }),
  body("address").optional().isObject().withMessage("Address must be an object"),
  body("address.houseNo").optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body("address.village").optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body("address.pincode")
    .optional({ checkFalsy: true })
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be 6 digits"),

  body("desiredRole").optional().trim().isLength({ max: 100 }),
  body("preferredLocations").optional().isArray({ max: 15 }).withMessage("Preferred locations must be a list"),
  body("preferredLocations.*").optional().trim().isLength({ max: 200 }),
  body("preferredJobTypes")
    .optional()
    .isArray({ max: 4 })
    .withMessage("Preferred job types must be a list"),
  body("preferredJobTypes.*")
    .optional()
    .isIn(["full-time", "part-time", "contract", "internship"]),
  body("preferredWorkModes")
    .optional()
    .isArray({ max: 3 })
    .withMessage("Preferred work modes must be a list"),
  body("preferredWorkModes.*").optional().isIn(["onsite", "remote", "hybrid"]),
  body("preferredIndustries")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Preferred industries must be a list"),
  body("preferredIndustries.*").optional().isIn(INDUSTRIES),

  body("highestEducation").optional({ checkFalsy: true }).isIn(EDUCATION_LEVELS),
  body("education").optional().isObject().withMessage("Education must be an object"),
  body("education.tenth.percentage").optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }),
  body("education.tenth.schoolName").optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body("education.tenth.board").optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body("education.tenth.yearOfPassing").optional({ checkFalsy: true }).isInt({ min: 1960, max: 2040 }),
  body("education.twelfth.percentage").optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }),
  body("education.twelfth.schoolName").optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body("education.twelfth.board").optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body("education.twelfth.yearOfPassing").optional({ checkFalsy: true }).isInt({ min: 1960, max: 2040 }),
  ...higherEducationRules("graduation"),
  ...higherEducationRules("masters"),
  ...higherEducationRules("phd"),

  body("companyName").optional().trim().isLength({ max: 100 }),
  body("companyWebsite").optional().trim().isURL().withMessage("Enter a valid URL"),
  body("companyDescription").optional().trim().isLength({ max: 2000 }),
];

// ---------- Jobs ----------
// Company ki zaroorat aur rules (create aur update dono mein)
const jobRequirementRules = [
  body("minEducation").optional({ checkFalsy: true }).isIn(EDUCATION_LEVELS).withMessage("Invalid education level"),
  body("minExperienceMonths")
    .optional({ checkFalsy: true })
    .isInt({ min: 0, max: 480 })
    .withMessage("Minimum experience must be between 0 and 480 months"),
  body("companyRules").optional().isObject().withMessage("Company rules must be an object"),
  body("companyRules.noticePeriod").optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body("companyRules.shiftTiming").optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body("companyRules.workingDays").optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body("companyRules.dressCode").optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body("companyRules.probationPeriod").optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body("companyRules.bondDetails").optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
  body("companyRules.otherRules").optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
];

export const createJobValidator = [
  body("title").trim().notEmpty().withMessage("Job title is required").isLength({ max: 120 }),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Job description is required")
    .isLength({ min: 30, max: 8000 })
    .withMessage("Description should be at least 30 characters"),
  body("location").trim().notEmpty().withMessage("Location is required").isLength({ max: 200 }),
  body("workMode").optional().isIn(["onsite", "remote", "hybrid"]),
  body("jobType").optional().isIn(["full-time", "part-time", "contract", "internship"]),
  body("experienceLevel").optional().isIn(["entry", "mid", "senior", "lead"]),
  body("salaryMin").optional().isFloat({ min: 0 }).withMessage("Min salary must be a positive number"),
  body("salaryMax").optional().isFloat({ min: 0 }).withMessage("Max salary must be a positive number"),
  body("skills").optional().isArray({ max: 30 }),
  body("skills.*").optional().trim().isLength({ max: 40 }),
  body("requirements").optional().isArray({ max: 30 }),
  body("requirements.*").optional().trim().isLength({ max: 300 }),
  body("isFeatured").optional().isBoolean().toBoolean(),
  body("isUrgent").optional().isBoolean().toBoolean(),
  body("category").optional({ checkFalsy: true }).isIn(INDUSTRIES).withMessage("Invalid industry/category"),
  ...jobRequirementRules,
];

export const updateJobValidator = [
  param("id").isMongoId().withMessage("Invalid job id"),
  body("title").optional().trim().isLength({ max: 120 }),
  body("description").optional().trim().isLength({ min: 30, max: 8000 }),
  body("status").optional().isIn(["active", "closed", "pending_review"]),
  body("isFeatured").optional().isBoolean().toBoolean(),
  body("isUrgent").optional().isBoolean().toBoolean(),
  body("category").optional({ checkFalsy: true }).isIn(INDUSTRIES).withMessage("Invalid industry/category"),
  ...jobRequirementRules,
];

export const jobIdValidator = [param("id").isMongoId().withMessage("Invalid job id")];

export const jobQueryValidator = [
  query("page").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
  query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 50 }).toInt(),
  query("keyword").optional({ values: "falsy" }).trim().isLength({ max: 100 }),
  query("location").optional({ values: "falsy" }).trim().isLength({ max: 200 }),
  query("salaryMin").optional({ values: "falsy" }).isFloat({ min: 0 }),
  query("salaryMax").optional({ values: "falsy" }).isFloat({ min: 0 }),
  query("skills").optional({ values: "falsy" }).trim().isLength({ max: 300 }),
  query("category").optional({ values: "falsy" }).trim().isLength({ max: 100 }),
];

// ---------- Applications ----------
export const applyValidator = [
  param("jobId").isMongoId().withMessage("Invalid job id"),
  body("coverLetter").optional().trim().isLength({ max: 2000 }).withMessage("Cover letter is too long"),
];

export const updateStatusValidator = [
  param("id").isMongoId().withMessage("Invalid application id"),
  body("status")
    .isIn(["applied", "shortlisted", "interview", "rejected", "hired"])
    .withMessage("Invalid status value"),
];

// ---------- Admin ----------
export const mongoIdParamValidator = [param("id").isMongoId().withMessage("Invalid id")];

export const jobIdParamValidator = [param("jobId").isMongoId().withMessage("Invalid job id")];