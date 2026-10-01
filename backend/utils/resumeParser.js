import fs from "fs";
import pdfParse from "pdf-parse";

/**
 * Extract plain text from a resume file. Only PDF is parsed for text content —
 * DOC/DOCX files are stored but not text-extracted in this version.
 */
export const extractResumeText = async (filePath) => {
  const ext = filePath.split(".").pop().toLowerCase();

  if (ext === "pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text.trim();
  }

  return null;
};
