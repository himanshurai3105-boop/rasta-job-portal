import React, { useEffect, useState } from "react";
import api, { SERVER_ORIGIN } from "../api/axios.js";
import { RowSkeleton } from "../components/Skeletons.jsx";

const statusColor = {
  applied: "bg-ink/10 text-ink/70",
  shortlisted: "bg-slateblue/10 text-slateblue",
  interview: "bg-amber/10 text-amber-dark",
  rejected: "bg-red-50 text-red-600",
  hired: "bg-success/10 text-success",
};

const EmployerCandidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState("");
  const [minExperience, setMinExperience] = useState("");
  const [status, setStatus] = useState("");
  const [jobId, setJobId] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get("/applications/employer/candidates", { params: { skills, minExperience, status, jobId } })
      .then((res) => {
        setCandidates(res.data.data);
        setJobs(res.data.jobs);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleFilter = (e) => {
    e.preventDefault();
    load();
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl">Candidates</h1>
      <p className="text-muted mt-2">Search across everyone who has applied to your postings.</p>

      <form onSubmit={handleFilter} className="flex flex-wrap gap-3 mt-6">
        <input
          placeholder="Skills, comma separated"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          className="px-4 py-2.5 rounded-full border border-ink/10 text-sm focus-ring flex-1 min-w-[180px]"
        />
        <input
          type="number"
          placeholder="Min. years experience"
          value={minExperience}
          onChange={(e) => setMinExperience(e.target.value)}
          className="px-4 py-2.5 rounded-full border border-ink/10 text-sm focus-ring w-48"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2.5 rounded-full border border-ink/10 text-sm focus-ring bg-white"
        >
          <option value="">Any status</option>
          <option value="applied">Applied</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="interview">Interview</option>
          <option value="rejected">Rejected</option>
          <option value="hired">Hired</option>
        </select>
        <select
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className="px-4 py-2.5 rounded-full border border-ink/10 text-sm focus-ring bg-white"
        >
          <option value="">Any job</option>
          {jobs.map((j) => (
            <option key={j._id} value={j._id}>
              {j.title}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-full bg-ink text-paper text-sm font-medium hover:bg-amber-dark transition-colors focus-ring"
        >
          Filter
        </button>
      </form>

      {loading ? (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="mt-10 p-10 text-center rounded-2xl bg-white border border-ink/10 text-muted">
          No candidates match these filters.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {candidates.map((c) => (
            <div key={c._id} className="p-5 rounded-2xl bg-white border border-ink/10">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-display text-lg">{c.applicant.name}</h3>
                  <p className="text-sm text-muted mt-1">
                    {c.applicant.email} · Applied to "{c.job.title}"
                  </p>
                  {c.applicant.experienceYears > 0 && (
                    <p className="text-xs text-muted mt-1">{c.applicant.experienceYears} yrs experience</p>
                  )}
                  {c.applicant.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {c.applicant.skills.map((s) => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-slateblue/10 text-slateblue">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-xs font-mono uppercase px-2.5 py-1 rounded-full shrink-0 ${statusColor[c.status]}`}>
                  {c.status}
                </span>
              </div>
              {c.applicant.resumeUrl && (
                <a
                  href={`${SERVER_ORIGIN}${c.applicant.resumeUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-3 text-xs text-slateblue hover:underline"
                >
                  View resume
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployerCandidates;
