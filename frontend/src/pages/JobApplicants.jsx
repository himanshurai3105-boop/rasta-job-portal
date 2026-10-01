import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { SERVER_ORIGIN } from "../api/axios.js";
import { RowSkeleton } from "../components/Skeletons.jsx";

const STATUSES = ["applied", "shortlisted", "interview", "rejected", "hired"];

const statusColor = {
  applied: "bg-ink/10 text-ink/70",
  shortlisted: "bg-slateblue/10 text-slateblue",
  interview: "bg-amber/10 text-amber-dark",
  rejected: "bg-red-50 text-red-600",
  hired: "bg-success/10 text-success",
};

const scoreColor = (score) => {
  if (score === null || score === undefined) return "text-muted";
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-amber-dark";
  return "text-red-500";
};

const recommendationLabel = {
  strong_yes: "Strong yes",
  yes: "Yes",
  maybe: "Maybe",
  no: "No",
};

const JobApplicants = () => {
  const { jobId } = useParams();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get(`/applications/job/${jobId}`).then((res) => setApplications(res.data.data)).finally(() => setLoading(false));
  };

  useEffect(load, [jobId]);

  const updateStatus = async (id, status) => {
    await api.put(`/applications/${id}/status`, { status });
    load();
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl">Applicants</h1>
      <p className="text-muted mt-2">
        {applications.length} candidate(s) applied — sorted by AI resume match score.
      </p>

      {loading ? (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="mt-10 p-10 text-center rounded-2xl bg-white border border-ink/10 text-muted">
          No applications yet.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {applications.map((app) => (
            <div key={app._id} className="p-5 rounded-2xl bg-white border border-ink/10">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-display text-lg">{app.applicant.name}</h3>
                  <p className="text-sm text-muted mt-1">{app.applicant.email}</p>
                  {app.applicant.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {app.applicant.skills.map((s) => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-slateblue/10 text-slateblue">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-xs font-mono uppercase px-2.5 py-1 rounded-full ${statusColor[app.status]}`}>
                    {app.status}
                  </span>
                  {app.resumeUrl && (
                    <a
                      href={`${SERVER_ORIGIN}${app.resumeUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slateblue hover:underline"
                    >
                      View resume
                    </a>
                  )}
                </div>
              </div>

              {app.coverLetter && (
                <p className="text-sm text-ink/80 mt-3 italic">"{app.coverLetter}"</p>
              )}

              {/* AI Resume Screening */}
              {app.aiScreening?.status === "completed" && (
                <div className="mt-4 p-4 rounded-xl bg-slateblue/5 border border-slateblue/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wide text-slateblue">
                      AI Resume Match
                    </span>
                    <span className={`text-lg font-display ${scoreColor(app.aiScreening.score)}`}>
                      {app.aiScreening.score}/100
                    </span>
                  </div>
                  <p className="text-sm text-ink/80 mt-2">{app.aiScreening.summary}</p>
                  {app.aiScreening.strengths?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-success">Strengths</p>
                      <ul className="text-xs text-ink/70 list-disc list-inside">
                        {app.aiScreening.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {app.aiScreening.gaps?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-red-500">Gaps</p>
                      <ul className="text-xs text-ink/70 list-disc list-inside">
                        {app.aiScreening.gaps.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {app.aiScreening?.status === "pending" && (
                <p className="text-xs text-muted mt-3">AI screening in progress…</p>
              )}

              {/* AI Interview Evaluation */}
              {app.aiInterview?.status === "completed" && (
                <div className="mt-3 p-4 rounded-xl bg-amber/5 border border-amber/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wide text-amber-dark">
                      AI Interview Result
                    </span>
                    <span className={`text-lg font-display ${scoreColor(app.aiInterview.evaluation.score)}`}>
                      {app.aiInterview.evaluation.score}/100
                    </span>
                  </div>
                  <p className="text-sm text-ink/80 mt-2">{app.aiInterview.evaluation.summary}</p>
                  {app.aiInterview.evaluation.recommendation && (
                    <p className="text-xs font-medium mt-2">
                      Recommendation:{" "}
                      <span className="text-amber-dark">
                        {recommendationLabel[app.aiInterview.evaluation.recommendation] ||
                          app.aiInterview.evaluation.recommendation}
                      </span>
                    </p>
                  )}
                </div>
              )}
              {app.aiInterview?.status === "in_progress" && (
                <p className="text-xs text-muted mt-3">Candidate is currently taking the AI interview…</p>
              )}
              {app.aiInterview?.status === "failed_violation" && (
                <p className="text-xs text-red-500 mt-3">AI interview ended early — candidate switched tabs mid-interview.</p>
              )}

              {/* MCQ Screening Test */}
              {app.mcqTest?.status === "completed" && (
                <div className="mt-3 p-4 rounded-xl bg-slateblue/5 border border-slateblue/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wide text-slateblue">Screening Test</span>
                    {app.mcqTest.autoShortlisted && (
                      <span className="ml-2 text-xs font-medium text-success">Auto-shortlisted</span>
                    )}
                  </div>
                  <span className={`text-lg font-display ${app.mcqTest.score >= 8 ? "text-success" : "text-ink/70"}`}>
                    {app.mcqTest.score}/10
                  </span>
                </div>
              )}
              {app.mcqTest?.status === "failed_violation" && (
                <p className="text-xs text-red-500 mt-3">Screening test ended early — candidate switched tabs mid-test.</p>
              )}
              {app.mcqTest?.status === "failed_timeout" && (
                <p className="text-xs text-muted mt-3">Screening test: candidate ran out of time.</p>
              )}
              {app.mcqTest?.status === "in_progress" && (
                <p className="text-xs text-muted mt-3">Candidate is currently taking the screening test…</p>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(app._id, s)}
                    disabled={app.status === s}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-ink/10 hover:border-amber disabled:opacity-40 disabled:hover:border-ink/10 focus-ring transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobApplicants;
