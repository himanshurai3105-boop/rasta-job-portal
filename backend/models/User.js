import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { geocodeText, userGeoText } from "../utils/geocode.js";

// Graduation / Masters / PhD sabke liye same structure
const higherEducationSchema = {
  degree: { type: String, default: "" }, // e.g. B.Tech, B.Com, M.Sc, MBA, PhD
  stream: { type: String, default: "" }, // e.g. Computer Science, Commerce
  percentage: { type: Number, min: 0, max: 100 },
  yearOfPassing: { type: Number },
  institution: { type: String, default: "" }, // college ya university ka naam
  isOtherInstitution: { type: Boolean, default: false }, // list mein nahi mila to "Other"
  institutionCode: { type: String, default: "" }, // Other chunne par college/university code
};

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
    profilePhotoUrl: { type: String, default: "" },
    role: {
      type: String,
      enum: ["jobseeker", "employer", "admin"],
      default: "jobseeker",
    },
    // Jobseeker fields
    headline: { type: String, default: "" },
    skills: [{ type: String }],
    resumeUrl: { type: String, default: "" },

    // Profile ek baar 80%+ complete ho gaya to true; uske baad login par dobara Profile page par nahi bheja jaata
    profileCompleted: { type: Boolean, default: false },

    // Experience: fresher ya experienced; total months save hote hain,
    // experienceYears purane code (search/recommendation) ke liye months/12 se sync rakha jaata hai
    experienceStatus: { type: String, enum: ["", "fresher", "experienced"], default: "" },
    experienceMonths: { type: Number, default: 0, min: 0 },
    experienceYears: { type: Number, default: 0, min: 0 },

    // location = area/city/state/country (job matching isi se hoti hai)
    location: { type: String, default: "" },
    // address = candidate ka khud likha hua hissa + pincode se aaye gaon/block/district/state
    address: {
      houseNo: { type: String, default: "" },
      village: { type: String, default: "" },
      block: { type: String, default: "" },
      district: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
    },
    // Candidate ki location ke coordinates (background mein apne aap bharte hain, km nikalne ke liye)
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    // Kis text ke liye coordinates nikale gaye (dobara na nikalne ke liye)
    geocodedFor: { type: String, default: "" },
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],

    // Education
    highestEducation: {
      type: String,
      enum: ["", "10th", "12th", "graduation", "masters", "phd"],
      default: "",
    },
    education: {
      tenth: {
        percentage: { type: Number, min: 0, max: 100 },
        schoolName: { type: String, default: "" },
        board: { type: String, default: "" },
        yearOfPassing: { type: Number },
      },
      twelfth: {
        percentage: { type: Number, min: 0, max: 100 },
        schoolName: { type: String, default: "" },
        board: { type: String, default: "" },
        yearOfPassing: { type: Number },
      },
      graduation: higherEducationSchema,
      masters: higherEducationSchema,
      phd: higherEducationSchema,
    },

    // Job seeking preferences
    desiredRole: { type: String, default: "" },
    preferredLocations: [{ type: String }],
    preferredJobTypes: [
      { type: String, enum: ["full-time", "part-time", "contract", "internship"] },
    ],
    preferredWorkModes: [{ type: String, enum: ["onsite", "remote", "hybrid"] }],
    preferredIndustries: [{ type: String }],

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

// Profile update (findByIdAndUpdate) ke baad candidate ki location ke coordinates background mein nikalo.
userSchema.post("findOneAndUpdate", function (doc) {
  if (!doc || doc.role !== "jobseeker") return;

  const text = userGeoText(doc);
  if (!text || doc.geocodedFor === text) return;

  geocodeText(text)
    .then(async (coords) => {
      if (coords === undefined) return; // service abhi band hai, baad mein dobara try hoga
      const update = coords
        ? { $set: { coordinates: { lat: coords.lat, lng: coords.lng }, geocodedFor: text } }
        : { $set: { geocodedFor: text }, $unset: { coordinates: "" } };
      await doc.constructor.updateOne({ _id: doc._id }, update);
    })
    .catch((err) => console.warn("User geocoding failed:", err.message));
});

export default mongoose.model("User", userSchema);