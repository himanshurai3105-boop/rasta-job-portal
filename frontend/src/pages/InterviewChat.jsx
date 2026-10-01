import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios.js";

const InterviewChat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [messages, setMessages] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState("");
  const [violated, setViolated] = useState(false);
  const bottomRef = useRef(null);
  const endedRef = useRef(false); // true once complete or violated — stops further interaction

  useEffect(() => {
    const init = async () => {
      try {
        const appRes = await api.get(`/applications/${id}`);
        setApplication(appRes.data.data);

        if (appRes.data.data.aiInterview?.status === "completed") {
          setIsComplete(true);
          endedRef.current = true;
          setEvaluation(appRes.data.data.aiInterview.evaluation);
          setMessages(appRes.data.data.aiInterview.transcript || []);
          setLoading(false);
          return;
        }
        if (appRes.data.data.aiInterview?.status === "failed_violation") {
          setViolated(true);
          endedRef.current = true;
          setLoading(false);
          return;
        }

        const startRes = await api.post(`/applications/${id}/interview/start`);
        setMessages(startRes.data.data.transcript || [{ role: "assistant", content: startRes.data.data.question }]);
      } catch (err) {
        setError(err.response?.data?.message || "Could not start the interview");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Tab-switch / minimize detection — immediately ends the interview as a violation
  useEffect(() => {
    if (loading) return;

    const handleVisibilityChange = async () => {
      if (document.hidden && !endedRef.current) {
        endedRef.current = true;
        setViolated(true);
        try {
          await api.post(`/applications/${id}/interview/violation`);
        } catch {
          // best-effort
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [id, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim() || submitting || endedRef.current) return;

    const userMessage = { role: "user", content: answer };
    setMessages((prev) => [...prev, userMessage]);
    setAnswer("");
    setSubmitting(true);
    setError("");

    try {
      const res = await api.post(`/applications/${id}/interview/answer`, { answer: userMessage.content });
      if (res.data.data.isComplete) {
        setIsComplete(true);
        endedRef.current = true;
        setEvaluation(res.data.data.evaluation);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: res.data.data.question }]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong — please try again");
      setMessages((prev) => prev.slice(0, -1));
      setAnswer(userMessage.content);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="skeleton h-8 w-1/2 rounded-md" />
        <div className="skeleton h-24 w-full rounded-2xl mt-6" />
      </div>
    );
  }

  if (violated) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl">
          ✕
        </div>
        <h1 className="font-display text-2xl mt-6">Interview ended</h1>
        <p className="text-muted mt-3">
          Switching tabs or windows during the interview isn't allowed — this attempt has been marked as
          failed and can't be resumed.
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

  if (error && messages.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 md:py-12 flex flex-col" style={{ minHeight: "70vh" }}>
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-amber-dark">AI Screening Interview</p>
        <h1 className="font-display text-2xl md:text-3xl mt-1">{application?.job?.title}</h1>
        {!isComplete && (
          <p className="text-muted text-sm mt-2">
            5 short questions — answer honestly. Stay on this tab; switching away ends the interview.
          </p>
        )}
      </div>

      <div className="flex-1 mt-6 space-y-4 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                m.role === "assistant"
                  ? "bg-white border border-ink/10 text-ink"
                  : "bg-ink text-paper"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {isComplete && evaluation && (
        <div className="mt-6 p-5 rounded-2xl bg-success/5 border border-success/20">
          <p className="font-display text-xl text-success">Interview complete</p>
          <p className="text-sm text-ink/80 mt-2">{evaluation.summary}</p>
          <button
            onClick={() => navigate("/applications")}
            className="mt-4 px-5 py-2.5 rounded-lg bg-ink text-paper text-sm font-medium hover:bg-amber-dark transition-colors focus-ring"
          >
            Back to my applications
          </button>
        </div>
      )}

      {!isComplete && (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2 sticky bottom-4">
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            disabled={submitting}
            className="flex-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring bg-white"
          />
          <button
            type="submit"
            disabled={submitting || !answer.trim()}
            className="px-5 py-3 rounded-xl bg-ink text-paper font-medium hover:bg-amber-dark transition-colors focus-ring disabled:opacity-50"
          >
            {submitting ? "..." : "Send"}
          </button>
        </form>
      )}
      {error && !isComplete && <p className="text-red-600 text-xs mt-2">{error}</p>}
    </div>
  );
};

export default InterviewChat;
