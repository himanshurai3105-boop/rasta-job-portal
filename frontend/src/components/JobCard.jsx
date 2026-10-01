import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

const formatSalary = (min, max, currency) => {
  if (!min && !max) return null;
  const fmt = (n) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n.toLocaleString());
  if (min && max) return `${currency} ${fmt(min)} – ${fmt(max)}`;
  return `${currency} ${fmt(min || max)}`;
};

const JobCard = ({ job, initiallySaved = false, onUnsave }) => {
  const { user } = useAuth();
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const [saved, setSaved] = useState(initiallySaved);
  const [saving, setSaving] = useState(false);

  const handleToggleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.post(`/jobs/${job._id}/save`);
      const nowSaved = res.data.data.saved;
      setSaved(nowSaved);
      if (!nowSaved && onUnsave) onUnsave(job._id);
    } catch (err) {
      // silent fail is fine here — non-critical action
    } finally {
      setSaving(false);
    }
  };

  return (
    <Link
      to={`/jobs/${job.slug}`}
      className={`group relative block bg-white border rounded-2xl p-5 sm:p-6 hover:border-amber hover:shadow-[0_4px_0_0_#E8A33D] active:scale-[0.99] transition-all focus-ring ${
        job.isUrgent
          ? "border-red-300"
          : job.isFeatured
          ? "border-amber/40"
          : "border-ink/10"
      }`}
    >
      {(job.isFeatured || job.isUrgent) && (
        <div className="flex gap-1.5 absolute -top-2.5 left-4">
          {job.isUrgent && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-500 text-white shadow-sm">
              🔥 Urgent
            </span>
          )}
          {job.isFeatured && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber text-ink shadow-sm">
              ★ Featured
            </span>
          )}
        </div>
      )}

      {user?.role === "jobseeker" && (
        <button
          onClick={handleToggleSave}
          aria-label={saved ? "Unsave job" : "Save job"}
          aria-pressed={saved}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1.5 rounded-full hover:bg-ink/5 transition-colors focus-ring z-10"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={saved ? "#E8A33D" : "none"}
            stroke={saved ? "#C87F1E" : "currentColor"}
            strokeWidth="2"
            className="text-ink/40"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      <div className="flex items-start justify-between gap-4 pr-6">
        <div className="min-w-0">
          <h3 className="font-display text-xl leading-snug group-hover:text-amber-dark transition-colors">
            {job.title}
          </h3>
          <p className="text-sm text-muted mt-1">{job.companyName} · {job.location}</p>
        </div>
        <span className="shrink-0 text-xs font-mono uppercase tracking-wide px-2.5 py-1 rounded-full bg-ink/5 text-ink/70">
          {job.workMode}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {(job.skills || []).slice(0, 4).map((s) => (
          <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-slateblue/10 text-slateblue font-medium">
            {s}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-ink/5">
        <span className="text-xs font-mono uppercase text-muted">{job.jobType.replace("-", " ")}</span>
        {salary && <span className="text-sm font-semibold text-success">{salary}</span>}
      </div>
    </Link>
  );
};

export default JobCard;
