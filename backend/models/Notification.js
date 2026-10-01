import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "new_applicant",
        "status_update",
        "job_saved_reminder",
        "welcome",
        "general",
      ],
      default: "general",
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: "" }, // frontend route to navigate to on click
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
