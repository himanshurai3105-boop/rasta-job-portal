import mongoose from "mongoose";
import slugify from "slugify";
import { geocodeText } from "../utils/geocode.js";

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
    // location ke coordinates (background mein apne aap bharte hain)
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    // Kis location text ke liye coordinates nikale gaye (dobara na nikalne ke liye)
    geocodedFor: { type: String, default: "" },
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
    // Company ki zaroorat: kam se kam padhai aur experience (months mein)
    minEducation: {
      type: String,
      enum: ["", "10th", "12th", "graduation", "masters", "phd"],
      default: "",
    },
    minExperienceMonths: { type: Number, default: 0, min: 0 },

    // Company ke rules / policies
    companyRules: {
      noticePeriod: { type: String, default: "" },
      shiftTiming: { type: String, default: "" },
      workingDays: { type: String, default: "" },
      dressCode: { type: String, default: "" },
      probationPeriod: { type: String, default: "" },
      bondDetails: { type: String, default: "" },
      otherRules: { type: String, default: "" },
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

// Job save hone ke baad (naya ya location badli ho to) coordinates background mein nikalo.
// Response ko rokta nahi, aur fail ho jaye to job waisi hi rehti hai.
jobSchema.post("save", function (doc) {
  if (!doc.location || doc.geocodedFor === doc.location) return;

  const location = doc.location;
  geocodeText(location)
    .then(async (coords) => {
      if (coords === undefined) return; // service abhi band hai, baad mein dobara try hoga
      const update = coords
        ? { $set: { coordinates: { lat: coords.lat, lng: coords.lng }, geocodedFor: location } }
        : { $set: { geocodedFor: location }, $unset: { coordinates: "" } };
      await doc.constructor.updateOne({ _id: doc._id }, update);
    })
    .catch((err) => console.warn("Job geocoding failed:", err.message));
});

export default mongoose.model("Job", jobSchema);