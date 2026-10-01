import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ReportButton from "../components/ReportButton.jsx";

const JobDetails = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [applied, setApplied] = useState(false);
  const [message, setMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/jobs/${slug}`).then((res) => setJob(res.data.data));
  }, [slug]);

  useEffect(() => {
    if (user?.role === "jobseeker" && job) {
      api.get("/jobs/saved/mine").then((res) => {
        setSaved(res.data.data.some((j) => j._id === job._id));
      });
    }
  }, [user, job]);

  const handleToggleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.post(`/jobs/${job._id}/save`);
      setSaved(res.data.data.saved);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError("");
    if (!file) {
      setResumeFile(null);
      return;
    }
    const allowedExt = [".pdf", ".doc", ".docx"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExt.includes(ext)) {
      setFileError("Only PDF, DOC, or DOCX files are allowed");
      setResumeFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("File must be under 5MB");
      setResumeFile(null);
      return;
    }
    setResumeFile(file);
  };

  const handleApply = async () => {
    setApplying(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("coverLetter", coverLetter);
      if (resumeFile) formData.append("resume", resumeFile);
      await api.post(`/applications/${job._id}`, formData);
      setApplied(true);
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not apply");
    } finally {
      setApplying(false);
    }
  };

  if (!job)
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 md:py-12">
        <div className="skeleton h-3 w-32 rounded-md" />
        <div className="skeleton h-10 w-2/3 rounded-md mt-3" />
        <div className="skeleton h-4 w-1/2 rounded-md mt-3" />
        <div className="skeleton h-40 w-full rounded-2xl mt-8" />
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 md:py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-amber-dark">
            {job.employer?._id ? (
              <Link to={`/company/${job.employer._id}`} className="hover:underline focus-ring rounded">
                {job.companyName}
              </Link>
            ) : (
              job.companyName
            )}
          </p>
          <h1 className="font-display text-3xl md:text-4xl mt-2">{job.title}</h1>
          <p className="text-muted mt-2">
            {job.location} · {job.workMode} · {job.jobType.replace("-", " ")}
          </p>
        </div>
        {user?.role === "jobseeker" && (
          <button
            onClick={handleToggleSave}
            disabled={saving}
            aria-pressed={saved}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-ink/10 hover:border-amber text-sm font-medium transition-colors focus-ring"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={saved ? "#E8A33D" : "none"}
              stroke={saved ? "#C87F1E" : "currentColor"}
              strokeWidth="2"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {saved ? "Saved" : "Save"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {(job.skills || []).map((s) => (
          <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-slateblue/10 text-slateblue font-medium">
            {s}
          </span>
        ))}
      </div>

      <div className="mt-8 prose-sm">
        <h2 className="font-display text-2xl mb-2">About the role</h2>
        <p className="text-ink/80 whitespace-pre-line">{job.description}</p>
      </div>

      {job.requirements?.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-xl mb-2">What you'll need</h3>
          <ul className="list-disc list-inside space-y-1 text-ink/80">
            {job.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 p-6 rounded-2xl bg-white border border-ink/10">
        {applied ? (
          <p className="text-success font-medium">
            Application sent — you can track its status from "My applications".
          </p>
        ) : !user ? (
          <p>
            <Link to="/login" className="text-amber-dark font-medium hover:underline">
              Log in
            </Link>{" "}
            as a job seeker to apply for this role.
          </p>
        ) : user.role !== "jobseeker" ? (
          <p className="text-muted">Only job seeker accounts can apply to roles.</p>
        ) : job.status !== "active" ? (
          <p className="text-muted">This role is no longer accepting applications.</p>
        ) : (
          <>
            <label className="text-sm font-medium">Resume (PDF, DOC, or DOCX — optional but recommended)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="w-full mt-1 text-sm file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-ink file:text-paper file:text-sm file:font-medium file:cursor-pointer hover:file:bg-amber-dark file:transition-colors"
            />
            {fileError && <p className="text-red-600 text-xs mt-1">{fileError}</p>}
            {resumeFile && (
              <p className="text-xs text-success mt-1">
                {resumeFile.name} — a PDF resume will be automatically screened against this role.
              </p>
            )}

            <label className="text-sm font-medium mt-4 block">Cover note (optional)</label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={4}
              placeholder="Why are you a good fit for this role?"
              className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
            />
            {message && <p className="text-red-600 text-sm mt-2">{message}</p>}
            <button
              onClick={handleApply}
              disabled={applying}
              className="mt-4 px-6 py-3 rounded-xl bg-ink text-paper font-medium hover:bg-amber-dark transition-colors focus-ring disabled:opacity-50"
            >
              {applying ? "Submitting..." : "Apply now"}
            </button>
          </>
        )}
      </div>

      <div className="mt-4">
        <ReportButton targetType="job" targetId={job._id} label="Report this job" />
      </div>
    </div>
  );
};

export default JobDetails;
