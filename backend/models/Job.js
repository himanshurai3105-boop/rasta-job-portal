import mongoose from "mongoose";
import slugify from "slugify";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyName: { type: String, required: true },
    companyLogoUrl: { type: String, default: "" },
    description: { type: String, required: true },
    responsibilities: [{ type: String }],
    requirements: [{ type: String }],
    skills: [{ type: String }],
    location: { type: String, required: true },
    workMode: {
      type: String,
      enum: ["onsite", "remote", "hybrid"],
      default: "onsite",
    },
    jobType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "internship"],
      default: "full-time",
    },
    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "senior", "lead"],
      default: "entry",
    },
    salaryMin: { type: Number, default: 0 },
    salaryMax: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    category: { type: String, default: "General" },
    status: {
      type: String,
      enum: ["active", "closed", "pending_review"],
      default: "active",
    },
    applicationsCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isUrgent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

jobSchema.index({ title: "text", description: "text", skills: "text" });

jobSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, { lower: true }) + "-" + Date.now().toString().slice(-6);
  }
  next();
});

export default mongoose.model("Job", jobSchema);
