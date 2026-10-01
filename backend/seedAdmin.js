// One-time script to create an admin account.
// Usage: node seedAdmin.js <email> <password> <name>
// Example: node seedAdmin.js admin@test.com Admin1234 "Admin User"

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const run = async () => {
  const [, , email, password, ...nameParts] = process.argv;
  const name = nameParts.join(" ") || "Admin";

  if (!email || !password) {
    console.log("Usage: node seedAdmin.js <email> <password> [name]");
    console.log('Example: node seedAdmin.js admin@test.com Admin1234 "Admin User"');
    process.exit(1);
  }

  if (password.length < 8) {
    console.log("Password must be at least 8 characters.");
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.log("MONGO_URI not found — make sure your .env file is set up.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    if (existing.role === "admin") {
      console.log(`"${email}" is already an admin. Nothing to do.`);
    } else {
      existing.role = "admin";
      await existing.save();
      console.log(`Existing account "${email}" (was: ${existing.role}) promoted to admin.`);
    }
  } else {
    await User.create({ name, email: email.toLowerCase(), password, role: "admin" });
    console.log(`New admin account created: ${email}`);
  }

  await mongoose.disconnect();
  console.log("Done. You can now log in with these credentials.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
