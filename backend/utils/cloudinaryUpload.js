import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

// File ke naam ko URL ke liye safe banata hai
const safeBaseName = (name = "file") =>
  path
    .parse(name)
    .name.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "file";

/**
 * Memory mein pade file (buffer) ko Cloudinary par upload karta hai.
 * - folder: "resumes" ya "photos"
 * - resourceType: PDF/DOC ke liye "raw", photo ke liye "image"
 * Return karta hai: https wala poora URL
 */
export const uploadBuffer = (buffer, { folder, resourceType = "raw", originalName = "file" }) => {
  if (!isCloudinaryConfigured()) {
    return Promise.reject(new Error("File storage is not configured. Please contact support."));
  }

  const ext = path.extname(originalName).toLowerCase();
  const base = `${safeBaseName(originalName)}-${Date.now()}`;
  // raw files mein extension public_id ka hissa hona chahiye, warna download par naam kharab aata hai
  const publicId = resourceType === "raw" ? `${base}${ext}` : base;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `rasta/${folder}`,
        resource_type: resourceType,
        public_id: publicId,
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};