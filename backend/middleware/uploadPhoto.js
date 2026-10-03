import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads", "photos");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

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
