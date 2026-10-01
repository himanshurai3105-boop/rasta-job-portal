import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "misleading", label: "Misleading" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "scam", label: "Looks like a scam" },
  { value: "other", label: "Other" },
];

const ReportButton = ({ targetType, targetId, label = "Report" }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/reports", { targetType, targetId, reason, description });
      setDone(true);
      setOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return <p className="text-xs text-success">Thanks — our team will take a look.</p>;
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted hover:text-red-500 transition-colors focus-ring rounded"
      >
        {open ? "Cancel" : label}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-3 p-4 rounded-xl bg-white border border-ink/10 max-w-sm">
          <label className="text-xs font-medium">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-ink/10 text-sm focus-ring bg-white"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <label className="text-xs font-medium block mt-3">Details (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-ink/10 text-sm focus-ring"
          />
          {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 px-4 py-2 rounded-lg bg-ink text-paper text-xs font-medium hover:bg-amber-dark transition-colors focus-ring disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit report"}
          </button>
        </form>
      )}
    </div>
  );
};

export default ReportButton;
