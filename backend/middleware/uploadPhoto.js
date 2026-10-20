import multer from "multer";
import path from "path";

// File memory mein rehti hai, phir controller usse Cloudinary par bhej deta hai
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error("Only JPG, PNG, or WEBP images are allowed"), false);
};

const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});

export default uploadPhoto;