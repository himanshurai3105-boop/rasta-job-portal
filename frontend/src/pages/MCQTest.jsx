import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios.js";

const MCQTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [violated, setViolated] = useState(false);

  const submittedRef = useRef(false);
  const timerRef = useRef(null);

  const submitTest = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    clearInterval(timerRef.current);
    try {
      const res = await api.post(`/applications/${id}/mcq/submit`, { answers });
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit the test");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    api
      .post(`/applications/${id}/mcq/start`)
      .then((res) => {
        setQuestions(res.data.data.questions);
        setAnswers(new Array(res.data.data.questions.length).fill(-1));
        setRemainingSeconds(res.data.data.remainingSeconds);
      })
      .catch((err) => setError(err.response?.data?.message || "Could not start the test"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (remainingSeconds === null || result || violated) return;
    if (remainingSeconds <= 0) {
      submitTest();
      return;
    }
    timerRef.current = setTimeout(() => setRemainingSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, result, violated]);

  useEffect(() => {
    if (result || loading) return;

    const handleVisibilityChange = async () => {
      if (document.hidden && !submittedRef.current) {
        submittedRef.current = true;
        clearInterval(timerRef.current);
        setViolated(true);
        try {
          await api.post(`/applications/${id}/mcq/violation`);
        } catch {
          // best-effort
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [id, result, loading]);

  const selectAnswer = (qIndex, optIndex) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = optIndex;
      return next;
    });
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="skeleton h-8 w-1/2 rounded-md" />
        <div className="skeleton h-96 w-full rounded-2xl mt-6" />
      </div>
    );
  }

  if (violated) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl">
          ✕
        </div>
        <h1 className="font-display text-2xl mt-6">Test ended</h1>
        <p className="text-muted mt-3">
          Switching tabs or windows during the test isn't allowed — this attempt has been marked as failed
          and can't be retaken.
        </p>
        <button
          onClick={() => navigate("/applications")}
          className="mt-6 px-5 py-2.5 rounded-lg bg-ink text-paper text-sm font-medium hover:bg-amber-dark transition-colors focus-ring"
        >
          Back to my applications
        </button>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center text-muted">
        {error}
      </div>
    );
  }

  if (result) {
    const passed = result.score >= 8 && result.status === "completed";
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto text-2xl ${
            passed ? "bg-success/10 text-success" : "bg-ink/5 text-ink/50"
          }`}
        >
          {passed ? "✓" : result.score}
        </div>
        <h1 className="font-display text-3xl mt-6">
          {result.score} / {result.total}
        </h1>
        {result.status === "failed_timeout" ? (
          <p className="text-muted mt-3">Time ran out before you submitted — this attempt was auto-submitted.</p>
        ) : passed ? (
          <p className="text-success mt-3">
            Great score! You've been automatically shortlisted — the employer can now see your application.
          </p>
        ) : (
          <p className="text-muted mt-3">Thanks for taking the test — the employer will review your application.</p>
        )}
        <button
          onClick={() => navigate("/applications")}
          className="mt-6 px-5 py-2.5 rounded-lg bg-ink text-paper text-sm font-medium hover:bg-amber-dark transition-colors focus-ring"
        >
          Back to my applications
        </button>
      </div>
    );
  }

  const answeredCount = answers.filter((a) => a !== -1).length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 md:py-12">
      <div className="flex items-center justify-between sticky top-16 bg-paper/95 backdrop-blur py-3 z-10 -mx-6 px-6 border-b border-ink/10">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-amber-dark">Screening Test</p>
          <p className="text-sm text-muted mt-0.5">{answeredCount} / {questions.length} answered</p>
        </div>
        <div
          className={`font-mono text-lg font-semibold px-3 py-1.5 rounded-lg ${
            remainingSeconds <= 60 ? "bg-red-50 text-red-600" : "bg-ink/5 text-ink"
          }`}
        >
          {formatTime(remainingSeconds)}
        </div>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-amber/10 text-amber-dark text-xs">
        Stay on this tab until you submit — switching away will immediately end the test.
      </div>

      <div className="mt-6 space-y-6">
        {questions.map((q, qi) => (
          <div key={qi} className="p-5 rounded-2xl bg-white border border-ink/10">
            <p className="font-medium">
              {qi + 1}. {q.question}
            </p>
            <div className="mt-3 space-y-2">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  type="button"
                  onClick={() => selectAnswer(qi, oi)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors focus-ring ${
                    answers[qi] === oi
                      ? "border-amber bg-amber/10 font-medium"
                      : "border-ink/10 hover:border-ink/30"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      <button
        onClick={submitTest}
        disabled={submitting}
        className="w-full mt-6 py-3 rounded-xl bg-ink text-paper font-medium hover:bg-amber-dark transition-colors focus-ring disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit test"}
      </button>
    </div>
  );
};

export default MCQTest;
