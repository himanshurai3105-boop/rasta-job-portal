import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios.js";

const MCQTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answers, setAnswers] = useState([]);

  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [violated, setViolated] = useState(false);

  const submittedRef = useRef(false);
  const timerRef = useRef(null);

  // 1. Initial Load: Start MCQ & Load Questions
  useEffect(() => {
    api
      .post(`/applications/${id}/mcq/start`)
      .then((res) => {
        const qList = res.data?.data?.questions || [];
        setQuestions(qList);
        setRemainingSeconds(res.data?.data?.remainingSeconds || 15 * 60);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not start the test");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // 2. Anti-Cheating: Tab Switch & Window Blur Auto-Fail
  useEffect(() => {
    if (result || loading || violated) return;

    const handleViolation = async () => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setViolated(true);
      clearInterval(timerRef.current);

      try {
        await api.post(`/applications/${id}/mcq/violation`);
      } catch (e) {
        console.error("Violation reporting failed:", e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    window.addEventListener("blur", handleViolation);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleViolation);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id, result, loading, violated]);

  // 3. Final Submission Function
  const submitFinalTest = async (finalAnswers) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    clearInterval(timerRef.current);

    try {
      const res = await api.post(`/applications/${id}/mcq/submit`, {
        answers: finalAnswers,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit the test");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Timer Handling
  useEffect(() => {
    if (remainingSeconds === null || result || violated) return;

    if (remainingSeconds <= 0) {
      submitFinalTest(answers);
      return;
    }

    timerRef.current = setTimeout(() => {
      setRemainingSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timerRef.current);
  }, [remainingSeconds, result, violated, answers]);

  // 5. One-by-One Question Next/Submit Handler
  const handleNextOrSubmit = () => {
    if (selectedOption === null) {
      alert("Kripya aage badhne se pehle koi ek vikalp (option) select karein.");
      return;
    }

    const updatedAnswers = [...answers, selectedOption];
    setAnswers(updatedAnswers);
    setSelectedOption(null);

    // Agar aakhiri question hai toh submit karein
    if (currentQuestionIndex + 1 >= questions.length) {
      submitFinalTest(updatedAnswers);
    } else {
      // Agle question par jayein
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Loading Skeleton
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2 mb-4"></div>
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  // Cheating / Violation Screen
  if (violated) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl font-bold">
          ✕
        </div>
        <h1 className="text-2xl font-bold mt-6 text-red-600">Test Disqualified!</h1>
        <p className="text-gray-600 mt-3">
          Cheating aur tab-switch proctoring rule ke mutabiq aapka test turant disqualify kar diya gaya hai.
        </p>
        <button
          onClick={() => navigate("/jobs")}
          className="mt-6 px-6 py-2.5 rounded-lg bg-black text-white hover:bg-gray-800 transition"
        >
          Back to Jobs
        </button>
      </div>
    );
  }

  // Error Screen
  if (error && questions.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center text-red-600">
        <p className="font-medium">{error}</p>
        <button
          onClick={() => navigate("/jobs")}
          className="mt-4 px-5 py-2 rounded bg-gray-200 text-gray-800"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Result Screen (80% Pass / Fail)
  if (result) {
    const passed = result.passed || (result.data && result.data.score >= 8);
    const score = result.data?.score ?? 0;
    const total = result.data?.total ?? questions.length;

    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center bg-white shadow rounded-2xl mt-10">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl font-bold ${
            passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          }`}
        >
          {passed ? "✓" : "✕"}
        </div>

        <h1 className="text-3xl font-bold mt-6">
          Score: {score} / {total}
        </h1>

        {passed ? (
          <div className="mt-4">
            <p className="text-green-600 font-semibold text-lg">
              Congratulations! Aapne test clear kar liya hai.
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Aapki application successfully submit ho chuki hai.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-red-500 font-semibold text-lg">
              Sorry, aap test clear nahi kar paye.
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Test clear karne ke liye kam se kam 80% (8/10) sahi hone zaroori the. Better luck next time!
            </p>
          </div>
        )}

        <button
          onClick={() => navigate(passed ? "/my-applications" : "/jobs")}
          className="mt-8 px-6 py-2.5 rounded-lg bg-black text-white hover:bg-gray-800 transition"
        >
          {passed ? "View My Applications" : "Explore Other Jobs"}
        </button>
      </div>
    );
  }

  // Active Test UI (1 Question at a time)
  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Top Bar: Progress & Live Timer */}
      <div className="flex items-center justify-between sticky top-4 bg-white/90 backdrop-blur p-4 rounded-xl border shadow-sm z-10">
        <div>
          <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">
            Assessment Test
          </span>
          <p className="text-sm font-semibold text-gray-800">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>

        <div
          className={`font-mono text-sm px-3 py-1.5 rounded-lg font-bold ${
            remainingSeconds < 60 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-800"
          }`}
        >
          ⏳ {formatTime(remainingSeconds || 0)}
        </div>
      </div>

      {/* Proctoring Warning Box */}
      <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
        <span>⚠️</span>
        <span>
          <strong>Proctoring Active:</strong> Doosra tab kholne ya window change karne par test turant fail ho jayega.
        </span>
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="mt-6 p-6 rounded-2xl bg-white border shadow-sm">
          <p className="text-base font-semibold text-gray-900 mb-5 leading-relaxed">
            {currentQuestionIndex + 1}. {currentQ.question}
          </p>

          <div className="space-y-3">
            {currentQ.options.map((opt, optIndex) => {
              const isSelected = selectedOption === optIndex;
              return (
                <button
                  key={optIndex}
                  type="button"
                  onClick={() => setSelectedOption(optIndex)}
                  className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <span className="inline-block w-6 font-bold text-gray-400">
                    {String.fromCharCode(65 + optIndex)}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {error && <p className="text-red-500 text-xs mt-4">{error}</p>}

          {/* Action Button */}
          <button
            onClick={handleNextOrSubmit}
            disabled={submitting || selectedOption === null}
            className={`w-full mt-6 py-3 rounded-xl font-medium text-white transition shadow ${
              selectedOption === null || submitting
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {submitting
              ? "Submitting..."
              : currentQuestionIndex + 1 === questions.length
              ? "Submit Test"
              : "Next Question →"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MCQTest;