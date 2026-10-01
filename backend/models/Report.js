import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["job", "user"], required: true },
    targetJob: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reason: {
      type: String,
      enum: ["spam", "misleading", "inappropriate", "scam", "other"],
      required: true,
    },
    description: { type: String, default: "", maxlength: 1000 },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
