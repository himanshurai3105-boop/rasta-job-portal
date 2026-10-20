// resumeParser.js
import pdfParse from "pdf-parse";

/**
 * Resume ka plain text nikalta hai (file buffer se).
 * Abhi sirf PDF ka text nikalta hai. DOC/DOCX store hote hain par unka text nahi nikalta.
 */
export const extractResumeText = async (buffer, fileName = "") => {
  const ext = fileName.split(".").pop().toLowerCase();

  if (ext === "pdf" && buffer) {
    const data = await pdfParse(buffer);
    return data.text.trim();
  }

  return null;
};

const isCloudinaryUrl = (url) => {
  try {
    return new URL(url).hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
};

/**
 * Profile mein pehle se save resume (Cloudinary link) ka text nikalta hai.
 * Sirf PDF aur sirf Cloudinary ke links. Kuch bhi galat ho to null return karta hai.
 */
export const extractResumeTextFromUrl = async (url) => {
  if (!url || !isCloudinaryUrl(url)) return null;
  if (!/\.pdf$/i.test(new URL(url).pathname)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 6 * 1024 * 1024) return null;
    return await extractResumeText(buffer, "resume.pdf");
  } finally {
    clearTimeout(timer);
  }
};