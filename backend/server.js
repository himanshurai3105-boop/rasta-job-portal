import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";

import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { generalLimiter } from "./middleware/rateLimiter.js";

import authRoutes from "./routes/authRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

dotenv.config();

// Fail fast if required env vars are missing — better than a confusing crash later
const requiredEnvVars = ["MONGO_URI", "JWT_SECRET"];
const missingVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(", ")}`);
  console.error("Check your .env file against .env.example");
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 20) {
  console.warn(
    "WARNING: JWT_SECRET is short. Use a long, random string in production (32+ characters)."
  );
}

connectDB();

const app = express();

// Trust the first proxy hop (needed for correct client IPs behind Render/Railway/Nginx etc.)
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL
].filter(Boolean); // undefined values ko clean karega

app.use(
  cors({
    origin: (origin, callback) => {
      // Postman, mobile apps ya server-to-server calls me origin undefined hota hai
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" })); // cap body size — mitigates payload-based DoS
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Sanitize against NoSQL operator injection (e.g. { "$gt": "" } in a login field)
app.use(mongoSanitize());

// Prevent HTTP parameter pollution (e.g. ?role=jobseeker&role=admin)
app.use(hpp());

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Serve uploaded files (resumes, logos) statically
app.use("/uploads", express.static("uploads"));

// General rate limit on all API routes
app.use("/api", generalLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
