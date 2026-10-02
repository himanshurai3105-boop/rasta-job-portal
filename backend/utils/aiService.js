import axios from "axios";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5-20250929";

const callClaude = async ({ system, messages, maxTokens = 1024 }) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set in .env — AI features are disabled.");
  }

  const response = await axios.post(
    ANTHROPIC_URL,
    { model: MODEL, max_tokens: maxTokens, system, messages },
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
    }
  );

  const textBlock = response.data.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
};

const extractJSON = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI did not return valid JSON");
  return JSON.parse(match[0]);
};

/**
 * Screen a resume against a job description.
 * Returns { score: 0-100, summary, strengths: [], gaps: [] }
 */
export const screenResume = async ({ jobTitle, jobDescription, jobRequirements, resumeText }) => {
  const system = `You are an experienced technical recruiter screening a candidate's resume against a job posting.
Be fair and objective — base your assessment only on evidence in the resume text.
Respond with ONLY a JSON object in this exact shape, no other text:
{"score": <integer 0-100>, "summary": "<2-3 sentence overall assessment>", "strengths": ["<point>", "<point>"], "gaps": ["<point>", "<point>"]}`;

  const userMessage = `JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

JOB REQUIREMENTS:
${(jobRequirements || []).join("\n")}

CANDIDATE RESUME TEXT:
${resumeText.slice(0, 8000)}`;

  const text = await callClaude({
    system,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: 700,
  });

  return extractJSON(text);
};

/**
 * Generate the next interview question given the conversation so far.
 * transcript: array of {role: 'assistant'|'user', content: string}
 */
export const getNextInterviewQuestion = async ({ jobTitle, jobDescription, transcript }) => {
  const questionCount = transcript.filter((t) => t.role === "assistant").length;
  const isLastQuestion = questionCount >= 4; // 0-indexed, so this is question 5

  const system = `You are conducting a structured screening interview for the role "${jobTitle}".
Job description: ${jobDescription.slice(0, 1500)}

Ask ONE thoughtful question at a time based on the candidate's previous answers — mix behavioral and role-relevant technical questions.
This is question number ${questionCount + 1} of 5.
${isLastQuestion ? "This is the FINAL question — after this, the interview will end." : ""}
Respond with ONLY a JSON object: {"question": "<your question>"}
Keep questions concise (1-3 sentences). Do not repeat earlier questions.`;

  const messages = transcript.length
    ? transcript.map((t) => ({ role: t.role, content: t.content }))
    : [{ role: "user", content: "[Begin the interview.]" }];

  if (transcript.length) {
    messages.push({
      role: "user",
      content: "[SYSTEM: Generate the next interview question now, as JSON only.]",
    });
  }

  const text = await callClaude({ system, messages, maxTokens: 300 });
  const parsed = extractJSON(text);

  return { question: parsed.question, isComplete: questionCount >= 5 };
};

/**
 * Evaluate a completed interview transcript.
 * Returns { score, summary, strengths: [], concerns: [], recommendation }
 */
export const evaluateInterview = async ({ jobTitle, jobDescription, transcript }) => {
  const system = `You are an experienced hiring manager evaluating a completed screening interview for "${jobTitle}".
Job description: ${jobDescription.slice(0, 1500)}

Review the full Q&A transcript and give a fair, evidence-based evaluation.
Respond with ONLY a JSON object in this exact shape:
{"score": <integer 0-100>, "summary": "<3-4 sentence overall assessment>", "strengths": ["<point>"], "concerns": ["<point>"], "recommendation": "<one of: strong_yes, yes, maybe, no>"}`;

  const transcriptText = transcript
    .map((t) => `${t.role === "assistant" ? "INTERVIEWER" : "CANDIDATE"}: ${t.content}`)
    .join("\n\n");

  const text = await callClaude({
    system,
    messages: [{ role: "user", content: transcriptText }],
    maxTokens: 700,
  });

  return extractJSON(text);
};

/**
 * Generate a 10-question multiple-choice screening test for a job's subject
 * matter (skills + domain), used as a timed, auto-graded assessment.
 * Returns [{ question, options: [4 strings], correctIndex }]
 */
export const generateMCQTest = async ({ jobTitle, jobDescription, skills }) => {
  // 1. Agar Anthropic API key nahi hai, toh fallback mock test return karo
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("ANTHROPIC_API_KEY missing - serving default mock test");
    return [
      {
        question: `In the context of ${jobTitle || "software development"}, what is the main purpose of version control systems like Git?`,
        options: [
          "To compile source code into machine code",
          "To track and manage changes to codebase over time",
          "To host live databases in cloud",
          "To design user interfaces automatically"
        ],
        correctIndex: 1
      },
      {
        question: "Which HTTP status code signifies that a requested resource was created successfully?",
        options: ["200 OK", "201 Created", "204 No Content", "400 Bad Request"],
        correctIndex: 1
      },
      {
        question: "Which data structure operates on a First-In-First-Out (FIFO) basis?",
        options: ["Stack", "Queue", "Tree", "Graph"],
        correctIndex: 1
      },
      {
        question: "What is the primary role of an index in a database?",
        options: [
          "To compress database file size",
          "To speed up data retrieval queries",
          "To encrypt sensitive passwords",
          "To create automatic database backups"
        ],
        correctIndex: 1
      },
      {
        question: "In web architecture, what is the main responsibility of a reverse proxy?",
        options: [
          "Running front-end CSS animations",
          "Distributing network traffic and load balancing",
          "Compiling backend TypeScript files",
          "Rendering HTML in user browser"
        ],
        correctIndex: 1
      },
      {
        question: "What does the ACID property stand for in database management systems?",
        options: [
          "Atomicity, Consistency, Isolation, Durability",
          "Access, Control, Integration, Delivery",
          "Authentication, Cipher, Integrity, Decryption",
          "Asynchronous, Concurrent, Isolated, Dynamic"
        ],
        correctIndex: 0
      },
      {
        question: "Which of the following is an idempotent HTTP method?",
        options: ["POST", "GET", "PATCH", "CONNECT"],
        correctIndex: 1
      },
      {
        question: "In RESTful API design, which method is typically used to completely replace an existing resource?",
        options: ["POST", "PUT", "PATCH", "HEAD"],
        correctIndex: 1
      },
      {
        question: "What is the main advantage of containerization tools like Docker?",
        options: [
          "Faster internet connection speeds",
          "Consistent runtime environments across development and production",
          "Automatic code bug fixing",
          "Eliminating the need for writing unit tests"
        ],
        correctIndex: 1
      },
      {
        question: `When working as a ${jobTitle || "professional"}, how should critical production bugs ideally be handled?`,
        options: [
          "Ignore and fix them in the next major quarterly release",
          "Directly push untested code directly to master branch without review",
          "Reproduce, isolate, write a hotfix with tests, and follow deployment protocols",
          "Shut down database servers immediately"
        ],
        correctIndex: 2
      }
    ];
  }

  // 2. Agar API key configured hai, toh Claude AI se generate karein
  const system = `You are a subject-matter expert creating a 10-question multiple-choice screening test for the role "${jobTitle}". Focus on practical, job-relevant knowledge from these skills/topics: ${(skills || []).join(", ") || "the role's core responsibilities"}.
Job context: ${jobDescription.slice(0, 1200)}

Rules:
- Exactly 10 questions, each with exactly 4 options.
- Mix difficulty: a few easy, mostly medium, a couple harder.
- Questions must be objective with one unambiguous correct answer.
- Do not repeat topics across questions.

Respond with ONLY a JSON object in this exact shape:
{"questions": [{"question": "<text>", "options": ["<a>", "<b>", "<c>", "<d>"], "correctIndex": <0-3>}, ... exactly 10 items]}`;

  const text = await callClaude({
    system,
    messages: [{ role: "user", content: "Generate the test now, as JSON only." }],
    maxTokens: 2500,
  });

  const parsed = extractJSON(text);
  if (!Array.isArray(parsed.questions) || parsed.questions.length !== 10) {
    throw new Error("AI did not return exactly 10 questions");
  }

  return parsed.questions;
};