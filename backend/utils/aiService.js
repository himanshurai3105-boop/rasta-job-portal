import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

const callGemini = async ({ system, prompt, maxTokens = 2500 }) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in .env");
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      maxOutputTokens: maxTokens,
    },
  });

  return response.text || "";
};

const extractJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!match) throw new Error("AI did not return valid JSON");
    return JSON.parse(match[0]);
  }
};

// Domain-Specific Fallback if API is busy
const getFallbackMCQ = (jobTitle = "") => {
  const title = jobTitle.toLowerCase();

  // 1. Sales & Business Development
  if (title.includes("sale") || title.includes("marketing") || title.includes("business") || title.includes("executive") || title.includes("bde")) {
    return [
      { question: "What does CRM stand for in sales management?", options: ["Customer Relationship Management", "Central Revenue Module", "Client Return Metric", "Customer Ratio Model"], correctIndex: 0 },
      { question: "What is the primary objective of cold calling?", options: ["Close deal instantly", "Introduce offering & qualify lead", "Customer complaints", "File delivery"], correctIndex: 1 },
      { question: "What does B2B stand for?", options: ["Business to Bank", "Business to Business", "Brand to Buyer", "Buyer to Business"], correctIndex: 1 },
      { question: "In a sales pipeline, what follows after lead qualification?", options: ["Immediate billing", "Product presentation / pitch", "Contract closure", "Refund"], correctIndex: 1 },
      { question: "What does KPI stand for in sales targets?", options: ["Key Performance Indicator", "Known Price Index", "Knowledge Point Item", "Key Purchase Index"], correctIndex: 0 },
      { question: "How should a sales executive address customer price objections?", options: ["Argue with buyer", "Demonstrate value and ROI", "Cancel proposal", "Hang up"], correctIndex: 1 },
      { question: "What does 'Upselling' mean?", options: ["Discounting stock", "Recommending an upgraded/premium product", "Refunding money", "Delaying delivery"], correctIndex: 1 },
      { question: "What does a Sales Funnel represent?", options: ["The visual stages of a customer purchase journey", "An accounting ledger", "A warehouse structure", "Delivery logistics"], correctIndex: 0 },
      { question: "What does churn rate measure?", options: ["New customers won", "Percentage of customers who stop doing business", "Server response speed", "Gross margin"], correctIndex: 1 },
      { question: "What is the primary purpose of a sales follow-up email?", options: ["Spam the inbox", "Keep discussion warm and address queries", "Threaten cancellation", "Close files"], correctIndex: 1 }
    ];
  }

  // 2. Technical & Coding Fallback
  return [
    { question: "Which data structure operates on LIFO (Last In First Out)?", options: ["Queue", "Stack", "Array", "Linked List"], correctIndex: 1 },
    { question: "Which JavaScript keyword declares a block-scoped constant?", options: ["var", "let", "const", "static"], correctIndex: 2 },
    { question: "What is the main role of a REST API?", options: ["Frontend layout", "System-to-system communication", "Disk partition", "Pixel smoothing"], correctIndex: 1 },
    { question: "In React, which hook manages side effects like API requests?", options: ["useState", "useEffect", "useMemo", "useRef"], correctIndex: 1 },
    { question: "Which MongoDB query retrieves documents matching a condition?", options: ["db.col.filter()", "db.col.find()", "db.col.search()", "db.col.fetch()"], correctIndex: 1 },
    { question: "What does HTTP status 404 signify?", options: ["Unauthorized", "Forbidden", "Not Found", "Server Crash"], correctIndex: 2 },
    { question: "Which algorithm has an average time complexity of O(n log n)?", options: ["Bubble Sort", "Merge Sort", "Insertion Sort", "Linear Search"], correctIndex: 1 },
    { question: "What is the primary role of Git in software projects?", options: ["Execution environment", "Version control and collaboration", "Database storage", "CSS bundling"], correctIndex: 1 },
    { question: "What is guaranteed by a database Primary Key?", options: ["Row uniqueness", "Foreign encryption", "Automatic indexing only", "Null entries"], correctIndex: 0 },
    { question: "What is the default package manager for Node.js?", options: ["pip", "gem", "npm", "composer"], correctIndex: 2 }
  ];
};

/**
 * AI Resume Screening - Strict evaluation
 */
export const screenResume = async ({ jobTitle, jobDescription, jobRequirements, resumeText }) => {
  const system = `You are a strict technical recruiter evaluating a candidate's resume for "${jobTitle}".
Score strictly from 0 to 100 based on relevant experience, skills, and qualifications.
Threshold rule: 72 or above means shortlisted for the role.
Respond strictly in JSON:
{"score": <integer 0-100>, "summary": "<assessment text>", "strengths": ["<str>"], "gaps": ["<gap>"]}`;

  const prompt = `JOB TITLE: ${jobTitle}
JOB DESCRIPTION: ${jobDescription}
REQUIREMENTS: ${(jobRequirements || []).join("\n")}
CANDIDATE RESUME: ${(resumeText || "").slice(0, 7000)}`;

  try {
    const text = await callGemini({ system, prompt, maxTokens: 1000 });
    return extractJSON(text);
  } catch (err) {
  console.warn("Resume screening failed:", err.message);
  throw err;
}
};

/**
 * AI 10-Question MCQ Generator (Strictly Job Role Specific)
 */
export const generateMCQTest = async ({ jobTitle, jobDescription, skills = [] }) => {
  const system = `You are a senior hiring specialist creating a 10-question screening quiz.
CRITICAL MANDATE:
The questions MUST be 100% relevant to the job domain: "${jobTitle}".
- If the role is Sales, Marketing, BDE, or Operations: Questions MUST test client relations, sales pipeline, objection handling, CRM, and revenue strategy.
- If the role is Engineering, Developer, or IT: Questions MUST test programming, databases, web protocols, and computer science.
Never mix domains.

Rules:
- Exactly 10 questions.
- Exactly 4 options per question.
- Exactly one correct option (correctIndex 0 to 3).
Output JSON only:
{"questions": [{"question": "<text>", "options": ["<opt0>", "<opt1>", "<opt2>", "<opt3>"], "correctIndex": <0-3>}]}`;

  const prompt = `Target Role: ${jobTitle}\nSkills: ${(skills || []).join(", ")}\nContext: ${(jobDescription || "").slice(0, 1000)}\nGenerate 10 objective MCQs now.`;

  try {
    const text = await callGemini({ system, prompt, maxTokens: 2500 });
    const parsed = extractJSON(text);

    if (Array.isArray(parsed.questions) && parsed.questions.length === 10) {
      return parsed.questions;
    }
    return getFallbackMCQ(jobTitle);
  } catch (err) {
    console.warn("Gemini busy, falling back to role template:", err.message);
    return getFallbackMCQ(jobTitle);
  }
};

export const getNextInterviewQuestion = async ({ jobTitle, jobDescription, transcript = [] }) => {
  return { question: "Tell us about your most relevant project or achievement.", isComplete: false };
};

export const evaluateInterview = async ({ jobTitle, jobDescription, transcript = [] }) => {
  return { score: 80, summary: "Completed screening.", strengths: ["Clear communication"], concerns: [], recommendation: "yes" };
};