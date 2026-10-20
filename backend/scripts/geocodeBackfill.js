import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { geocodeText, userGeoText } from "../utils/geocode.js";

const hasCoords = (doc) => doc.coordinates?.lat != null && doc.coordinates?.lng != null;

const run = async () => {
  await connectDB();

  // ---- Jobs ----
  const jobs = await Job.find({ status: "active" });
  const jobsToDo = jobs.filter((j) => !hasCoords(j) && j.location);
  console.log(`Jobs to geocode: ${jobsToDo.length}`);

  let jobsDone = 0;
  for (const job of jobsToDo) {
    const coords = await geocodeText(job.location);
    if (coords) {
      await Job.updateOne(
        { _id: job._id },
        { $set: { coordinates: { lat: coords.lat, lng: coords.lng }, geocodedFor: job.location } }
      );
      jobsDone += 1;
      console.log(`  OK    ${job.location}`);
    } else {
      console.log(`  SKIP  ${job.location} (${coords === undefined ? "service error" : "not found"})`);
    }
  }

  // ---- Jobseekers ----
  const users = await User.find({ role: "jobseeker" });
  const usersToDo = users.filter((u) => !hasCoords(u) && userGeoText(u));
  console.log(`Candidates to geocode: ${usersToDo.length}`);

  let usersDone = 0;
  for (const user of usersToDo) {
    const text = userGeoText(user);
    const coords = await geocodeText(text);
    if (coords) {
      await User.updateOne(
        { _id: user._id },
        { $set: { coordinates: { lat: coords.lat, lng: coords.lng }, geocodedFor: text } }
      );
      usersDone += 1;
      console.log(`  OK    ${text}`);
    } else {
      console.log(`  SKIP  ${text} (${coords === undefined ? "service error" : "not found"})`);
    }
  }

  console.log(`Done. Jobs updated: ${jobsDone}, candidates updated: ${usersDone}`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});