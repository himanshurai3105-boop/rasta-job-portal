import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios.js";

const MCQTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [violationOccurred, setViolationOccurred] = useState(false);

  // 1. Fetch Questions on Mount
  useEffect(() => {
    let isMounted = true;

    const fetchTest = async () => {
      try {
        const res = await api.post(`/applications/${id}/mcq/start`, {});

        if (!isMounted) return;
        const testData = res.data?.data || res.data || {};
        setQuestions(testData.questions || []);
        setJobTitle(testData.jobTitle || "Role Assessment");
        if (typeof testData.remainingSeconds === "number") {
          setTimeLeft(testData.remainingSeconds);
        }
        setLoading(false);
      } catch (err) {
        console.error("Test start error:", err);
        if (!isMounted) return;
        alert(err.response?.data?.message || err.message || "Failed to load test questions.");
        navigate("/my-applications");
      }
    };

    fetchTest();
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  // 2. Strict Anti-Cheating (Tab switch / Window blur hone par instant reject)
  useEffect(() => {
    if (loading || isSubmitting || result || violationOccurred) return;

    const triggerViolation = async (reason) => {
      setViolationOccurred(true);
      setIsSubmitting(true);
      try {
        await api.post(`/applications/${id}/mcq/violation`, {});
      } catch (err) {
        console.error("Violation send error:", err);
      } finally {
        setResult({
          passed: false,
          testPassed: false,
          status: "rejected",
          message: reason,
        });
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        triggerViolation("Disqualified: Browser tab ya doosri window open ki gayi. Test disqualify kar diya gaya hai.");
      }
    };

    const handleBlur = () => {
      triggerViolation("Disqualified: Test window se focus hat gaya. Rule violation ke chalte test reject ho gaya.");
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [loading, isSubmitting, result, violationOccurred, id]);

  // 3. Countdown Timer
  useEffect(() => {
    if (loading || isSubmitting || result) return;

    if (timeLeft <= 0) {
      handleFinalSubmit();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, loading, isSubmitting, result]);

  // 4. Submit Answers
  const handleFinalSubmit = async (finalAnswers = selectedAnswers) => {
    setIsSubmitting(true);
    try {
      const answersArray = questions.map((_, idx) =>
        finalAnswers[idx] !== undefined ? finalAnswers[idx] : -1
      );

      const res = await api.post(`/applications/${id}/mcq/submit`, {
        answers: answersArray,
      });

      const submitData = res.data?.data || res.data || {};
      setResult(submitData);
    } catch (err) {
      alert("Submission error: " + (err.response?.data?.message || err.message));
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (selectedAnswers[currentIndex] === undefined) {
      alert("Kripya agla question dekhne se pehle koi ek option select karein.");
      return;
    }

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinalSubmit();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-xl font-semibold text-gray-700">Loading Job Assessment Test...</div>
      </div>
    );
  }

  // Result Screen
  if (result) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-2xl shadow-xl border text-center font-sans">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Assessment Result</h2>

        {result.score !== undefined && (
          <div className="my-6 p-4 bg-gray-50 rounded-xl space-y-2">
            <p className="text-gray-600 font-medium">
              Test Score:{" "}
              <span className={`text-2xl font-bold ${result.testPassed ? "text-green-600" : "text-red-600"}`}>
                {result.score} / {result.total || questions.length} ({result.score * 10}%)
              </span>
            </p>
            {result.resumeScore !== undefined && result.resumeScore !== null && (
              <p className="text-gray-600 font-medium">
                AI Resume Match: <span className="text-2xl font-bold text-blue-600">{result.resumeScore}%</span>
              </p>
            )}
          </div>
        )}

        <div
          className={`p-4 rounded-xl font-bold text-lg mb-6 ${
            result.testPassed || result.autoShortlisted
              ? "bg-green-100 text-green-800"
              : result.status === "applied"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {result.message || (result.testPassed ? "Test qualified!" : "Sorry, you can't qualify the test.")}
        </div>

        <button
          onClick={() => navigate("/my-applications")}
          className="px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-black transition"
        >
          Go to My Applications
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="max-w-2xl mx-auto my-10 p-6 bg-white rounded-2xl shadow-lg border border-gray-100 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <div>
          <span className="text-xs uppercase font-bold text-indigo-600 tracking-wider">Role Assessment</span>
          <h2 className="text-xl font-bold text-gray-800">{jobTitle}</h2>
          <span className="text-xs text-gray-500">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-400 uppercase font-semibold block">Time Left</span>
          <span className={`text-2xl font-black ${timeLeft < 120 ? "text-red-600 animate-pulse" : "text-gray-800"}`}>
            {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </span>
        </div>
      </div>

      {/* Proctoring Warning */}
      <div className="mb-6 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg text-center font-medium">
        ⚠️ Warning: Do not switch tabs, minimize, or click outside the window. Any focus loss will instantly fail the test.
      </div>

      {/* Question */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 leading-snug">
          {currentIndex + 1}. {currentQ?.question}
        </h3>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-8">
        {currentQ?.options?.map((opt, idx) => (
          <label
            key={idx}
            className={`flex items-center p-4 border rounded-xl cursor-pointer transition ${
              selectedAnswers[currentIndex] === idx
                ? "border-indigo-600 bg-indigo-50 shadow-sm"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name={`question_${currentIndex}`}
              checked={selectedAnswers[currentIndex] === idx}
              onChange={() => setSelectedAnswers({ ...selectedAnswers, [currentIndex]: idx })}
              className="w-4 h-4 text-indigo-600 mr-3"
            />
            <span className="text-gray-800 font-medium text-sm">{opt}</span>
          </label>
        ))}
      </div>

      {/* Action Button */}
      <button
        onClick={handleNext}
        disabled={isSubmitting}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md transition disabled:bg-gray-400"
      >
        {currentIndex + 1 === questions.length ? "Submit Final Assessment" : "Save & Next Question"}
      </button>
    </div>
  );
};

export default MCQTest;