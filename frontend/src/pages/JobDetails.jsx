import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { fileUrl } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ReportButton from "../components/ReportButton.jsx";
import JobLocationMap from "../components/JobLocationMap.jsx";
import { EDUCATION_LEVELS } from "../data/education.js";
import { distanceKm, formatKm } from "../utils/distance.js";

const RULE_LABELS = [
  ["noticePeriod", "Notice period"],
  ["shiftTiming", "Shift timing"],
  ["workingDays", "Working days"],
  ["dressCode", "Dress code"],
  ["probationPeriod", "Probation period"],
  ["bondDetails", "Bond / agreement"],
  ["otherRules", "Other rules"],
];

const formatMonths = (m) => {
  if (!m || m <= 0) return "";
  if (m < 12) return `${m} month${m === 1 ? "" : "s"}`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (r) return `${y} yr ${r} mo`;
  return `${y} year${y === 1 ? "" : "s"}`;
};

const verdictStyle = {
  strong: { label: "Strong match", box: "bg-success/10 text-success" },
  good: { label: "Good match", box: "bg-success/10 text-success" },
  partial: { label: "Partial match", box: "bg-amber/10 text-amber-dark" },
  low: { label: "Low match", box: "bg-red-50 text-red-600" },
};

const JobDetails = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeChoice, setResumeChoice] = useState("upload"); // "profile" ya "upload"
  const [resumeFile, setResumeFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [applied, setApplied] = useState(false);
  const [message, setMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fit, setFit] = useState(null);
  const [fitLoading, setFitLoading] = useState(false);
  const [fitError, setFitError] = useState("");

  const hasProfileResume = Boolean(user?.resumeUrl);

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

  // Profile mein resume hai to wahi default choice rahe
  useEffect(() => {
    setResumeChoice(user?.resumeUrl ? "profile" : "upload");
  }, [user?.resumeUrl]);

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

  const handleCheckFit = async () => {
    setFitLoading(true);
    setFitError("");
    try {
      const res = await api.post(`/jobs/${job._id}/fit`);
      setFit(res.data.data);
    } catch (err) {
      setFitError(err.response?.data?.message || "Could not check your fit right now. Please try again.");
    } finally {
      setFitLoading(false);
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
    setMessage("");

    // Profile resume hai aur "alag resume" chuna, to file zaroori hai
    if (resumeChoice === "upload" && hasProfileResume && !resumeFile) {
      setMessage("Please choose a resume file, or switch to your profile resume.");
      return;
    }

    setApplying(true);
    try {
      const formData = new FormData();
      formData.append("coverLetter", coverLetter);
      if (resumeChoice === "upload" && resumeFile) formData.append("resume", resumeFile);
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

  const minEducationLabel = EDUCATION_LEVELS.find((l) => l.value === job.minEducation)?.label;
  const minExperienceLabel = formatMonths(job.minExperienceMonths);
  const rules = RULE_LABELS.map(([key, label]) => ({ label, value: (job.companyRules?.[key] || "").trim() })).filter(
    (r) => r.value
  );
  const hasExpectations = Boolean(minEducationLabel || minExperienceLabel || rules.length > 0);

  // Map aur doori
  const jobCoords =
    job.coordinates?.lat != null && job.coordinates?.lng != null ? job.coordinates : null;
  const userCoords =
    user?.role === "jobseeker" && user?.coordinates?.lat != null && user?.coordinates?.lng != null
      ? user.coordinates
      : null;
  const km = jobCoords && userCoords ? distanceKm(userCoords, jobCoords) : null;
  const showMap = Boolean(jobCoords) && job.workMode !== "remote";

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

      {/* Job ki location ka map */}
      {showMap && (
        <div className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
            <h3 className="font-display text-xl">Job location</h3>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${jobCoords.lat},${jobCoords.lng}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slateblue hover:underline"
            >
              Open in Maps
            </a>
          </div>
          {km !== null ? (
            <p className="text-sm text-ink/80 mb-2">
              About <span className="font-semibold">{formatKm(km)}</span> from your location{" "}
              <span className="text-xs text-muted">(straight line, not road distance)</span>
            </p>
          ) : (
            user?.role === "jobseeker" && (
              <p className="text-xs text-muted mb-2">
                Add your location in your{" "}
                <Link to="/profile" className="text-amber-dark hover:underline">
                  profile
                </Link>{" "}
                to see how far this job is from you.
              </p>
            )
          )}
          <JobLocationMap jobCoords={jobCoords} jobTitle={job.title} userCoords={userCoords} />
        </div>
      )}

      {/* Company ki zaroorat aur rules */}
      {hasExpectations && (
        <div className="mt-6 p-5 rounded-2xl bg-white border border-ink/10">
          <h3 className="font-display text-xl mb-3">What the company expects</h3>
          <dl className="space-y-2 text-sm">
            {minEducationLabel && (
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-muted">Minimum qualification</dt>
                <dd className="text-ink/80">{minEducationLabel}</dd>
              </div>
            )}
            {minExperienceLabel && (
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-muted">Minimum experience</dt>
                <dd className="text-ink/80">{minExperienceLabel}</dd>
              </div>
            )}
            {rules.map((r) => (
              <div key={r.label} className="flex gap-3">
                <dt className="w-40 shrink-0 text-muted">{r.label}</dt>
                <dd className="text-ink/80 whitespace-pre-line">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* AI fit check (sirf jobseeker ko) */}
      {user?.role === "jobseeker" && job.status === "active" && !applied && (
        <div className="mt-6 p-5 rounded-2xl bg-white border border-ink/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl">Am I a good fit?</h3>
              <p className="text-xs text-muted mt-1">
                AI compares your profile with this role and the company's rules before you apply.
              </p>
            </div>
            <button
              onClick={handleCheckFit}
              disabled={fitLoading}
              className="px-4 py-2.5 rounded-xl bg-amber text-ink text-sm font-medium hover:bg-amber-dark transition-colors focus-ring disabled:opacity-50"
            >
              {fitLoading ? "Checking..." : fit ? "Check again" : "Check my fit with AI"}
            </button>
          </div>

          {fitError && <p className="text-red-600 text-sm mt-3">{fitError}</p>}

          {fit && (
            <div className="mt-4 space-y-4">
              <div className={`p-4 rounded-xl ${verdictStyle[fit.verdict]?.box || "bg-ink/5"}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{verdictStyle[fit.verdict]?.label}</span>
                  <span className="text-2xl font-bold">{fit.matchPercent}%</span>
                </div>
                {fit.summary && <p className="text-sm mt-2 text-ink/80">{fit.summary}</p>}
              </div>

              {fit.strengths?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-success">What works for you</p>
                  <ul className="list-disc list-inside text-sm text-ink/80 mt-1 space-y-1">
                    {fit.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {fit.gaps?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-dark">What is missing</p>
                  <ul className="list-disc list-inside text-sm text-ink/80 mt-1 space-y-1">
                    {fit.gaps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {fit.ruleConcerns?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600">Company rules to think about</p>
                  <ul className="list-disc list-inside text-sm text-ink/80 mt-1 space-y-1">
                    {fit.ruleConcerns.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {fit.tips?.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Before you apply</p>
                  <ul className="list-disc list-inside text-sm text-ink/80 mt-1 space-y-1">
                    {fit.tips.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-muted">
                {fit.source === "ai"
                  ? "This is guidance only. The employer makes the final decision, and you can still apply."
                  : "AI is not available right now, so this is a basic check from your profile. You can still apply."}{" "}
                <Link to="/profile" className="text-amber-dark hover:underline">
                  Update your profile
                </Link>{" "}
                for a more accurate result.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-10 p-6 rounded-2xl bg-white border border-ink/10">
        {applied ? (
          <p className="text-success font-medium">
            Application sent — open "My applications" to take your 10-minute screening test (pass mark: 8/10).
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
            <p className="text-sm font-medium">Resume</p>

            {hasProfileResume && (
              <div className="mt-2 space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-ink/10 cursor-pointer has-[:checked]:border-amber has-[:checked]:bg-amber/5">
                  <input
                    type="radio"
                    name="resumeChoice"
                    checked={resumeChoice === "profile"}
                    onChange={() => setResumeChoice("profile")}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    Use my profile resume{" "}
                    <a
                      href={fileUrl(user.resumeUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slateblue hover:underline ml-1"
                    >
                      (view)
                    </a>
                  </span>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-ink/10 cursor-pointer has-[:checked]:border-amber has-[:checked]:bg-amber/5">
                  <input
                    type="radio"
                    name="resumeChoice"
                    checked={resumeChoice === "upload"}
                    onChange={() => setResumeChoice("upload")}
                    className="mt-1"
                  />
                  <span className="text-sm">Upload a different resume for this job</span>
                </label>
              </div>
            )}

            {resumeChoice === "upload" && (
              <div className="mt-3">
                {!hasProfileResume && (
                  <p className="text-xs text-muted mb-1">
                    PDF, DOC, or DOCX. Optional, but a PDF resume lets AI screen your application.
                  </p>
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="w-full text-sm file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-ink file:text-paper file:text-sm file:font-medium file:cursor-pointer hover:file:bg-amber-dark file:transition-colors"
                />
                {fileError && <p className="text-red-600 text-xs mt-1">{fileError}</p>}
                {resumeFile && (
                  <p className="text-xs text-success mt-1">
                    {resumeFile.name}: a PDF resume will be automatically screened against this role.
                  </p>
                )}
              </div>
            )}

            {resumeChoice === "profile" && (
              <p className="text-xs text-muted mt-2">
                Your profile resume will be screened against this role (PDF only).
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

            <p className="text-xs text-muted mt-3">
              After you apply, you will take a 10-minute screening test. You need at least 8 out of 10 to qualify.
            </p>

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