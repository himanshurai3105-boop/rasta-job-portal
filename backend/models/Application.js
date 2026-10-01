import mongoose from "mongoose";

const interviewMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["assistant", "user"], required: true },
    content: { type: String, required: true },
  },
  { _id: false, timestamps: true }
);

const mcqQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true, select: false }, // hidden from candidate-facing reads
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coverLetter: { type: String, default: "" },

    // Resume
    resumeUrl: { type: String, default: "" },
    resumeText: { type: String, default: "", select: false },

    status: {
      type: String,
      enum: ["applied", "shortlisted", "interview", "rejected", "hired"],
      default: "applied",
    },

    // AI Resume Screening
    aiScreening: {
      score: { type: Number, default: null },
      summary: { type: String, default: "" },
      strengths: [{ type: String }],
      gaps: [{ type: String }],
      status: {
        type: String,
        enum: ["pending", "completed", "failed", "skipped"],
        default: "pending",
      },
    },

    // AI Interview
    aiInterview: {
      transcript: [interviewMessageSchema],
      status: {
        type: String,
        enum: ["not_started", "in_progress", "completed", "failed_violation"],
        default: "not_started",
      },
      evaluation: {
        score: { type: Number, default: null },
        summary: { type: String, default: "" },
        strengths: [{ type: String }],
        concerns: [{ type: String }],
        recommendation: { type: String, default: "" },
      },
    },

    // AI-generated MCQ screening test — 10 questions, timed, auto-graded
    mcqTest: {
      questions: [mcqQuestionSchema],
      answers: [{ type: Number }], // selected option index per question, -1 if unanswered
      score: { type: Number, default: null }, // out of 10
      timeLimitMinutes: { type: Number, default: 10 },
      startedAt: { type: Date },
      submittedAt: { type: Date },
      status: {
        type: String,
        enum: ["not_started", "in_progress", "completed", "failed_violation", "failed_timeout"],
        default: "not_started",
      },
      autoShortlisted: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

export default mongoose.model("Application", applicationSchema);
