import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, default: "" },
    role: {
      type: String,
      enum: ["jobseeker", "employer", "admin"],
      default: "jobseeker",
    },
    // Jobseeker fields
    headline: { type: String, default: "" },
    skills: [{ type: String }],
    resumeUrl: { type: String, default: "" },
    experienceYears: { type: Number, default: 0 },
    location: { type: String, default: "" },
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],

    // Job seeking preferences
    desiredRole: { type: String, default: "" },
    preferredLocations: [{ type: String }],
    preferredJobTypes: [
      { type: String, enum: ["full-time", "part-time", "contract", "internship"] },
    ],
    preferredWorkModes: [{ type: String, enum: ["onsite", "remote", "hybrid"] }],

    // Employer fields
    companyName: { type: String, default: "" },
    companyLogoUrl: { type: String, default: "" },
    companyWebsite: { type: String, default: "" },
    companyDescription: { type: String, default: "" },

    isBlocked: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },

    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
