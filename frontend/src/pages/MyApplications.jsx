import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { RowSkeleton } from "../components/Skeletons.jsx";

const statusColor = {
  applied: "bg-ink/10 text-ink/70",
  shortlisted: "bg-slateblue/10 text-slateblue",
  interview: "bg-amber/10 text-amber-dark",
  rejected: "bg-red-50 text-red-600",
  hired: "bg-success/10 text-success",
};

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/applications/mine").then((res) => setApplications(res.data.data)).finally(() => setLoading(false));
  }, []);

  const canTakeTest = (app) =>
    ["not_started", "in_progress"].includes(app.mcqTest?.status) &&
    !["rejected", "hired"].includes(app.status);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl">My applications</h1>
      <p className="text-muted mt-2">Track where every application stands.</p>

      {loading ? (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="mt-10 p-10 text-center rounded-2xl bg-white border border-ink/10 text-muted">
          No applications yet.{" "}
          <Link to="/jobs" className="text-amber-dark font-medium hover:underline focus-ring rounded">
            Browse openings
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {applications.map((app) => (
            <div key={app._id} className="p-5 rounded-2xl bg-white border border-ink/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg truncate">{app.job?.title || "Job removed"}</h3>
                  <p className="text-sm text-muted mt-1">
                    {app.job?.companyName} · {app.job?.location}
                  </p>
                </div>
                <span className={`text-xs font-mono uppercase px-2.5 py-1 rounded-full shrink-0 w-fit ${statusColor[app.status]}`}>
                  {app.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {canTakeTest(app) && (
                  <Link
                    to={`/mcq-test/${app._id}`}
                    className="inline-block text-sm font-medium px-4 py-2 rounded-lg bg-slateblue text-white hover:opacity-90 transition-opacity focus-ring"
                  >
                    {app.mcqTest?.status === "in_progress" ? "Resume screening test" : "Take screening test (10 Q · 10 min)"}
                  </Link>
                )}

                {app.status === "interview" &&
                  !["completed", "failed_violation"].includes(app.aiInterview?.status) && (
                    <Link
                      to={`/interview/${app._id}`}
                      className="inline-block text-sm font-medium px-4 py-2 rounded-lg bg-amber text-ink hover:bg-amber-dark transition-colors focus-ring"
                    >
                      {app.aiInterview?.status === "in_progress" ? "Continue AI Interview" : "Start AI Interview"}
                    </Link>
                  )}
              </div>

              {app.mcqTest?.status === "completed" && (
                <p className={`text-xs mt-3 ${app.mcqTest.score >= 8 ? "text-success" : "text-muted"}`}>
                  Screening test: {app.mcqTest.score}/10
                  {app.mcqTest.autoShortlisted && " — auto-shortlisted!"}
                </p>
              )}
              {app.mcqTest?.status === "failed_violation" && (
                <p className="text-xs text-red-500 mt-3">Screening test ended early (tab switch detected).</p>
              )}
              {app.mcqTest?.status === "failed_timeout" && (
                <p className="text-xs text-muted mt-3">Screening test: time ran out before submitting.</p>
              )}

              {app.aiInterview?.status === "completed" && (
                <p className="text-xs text-success mt-2">
                  AI interview completed — the employer has your results.
                </p>
              )}
              {app.aiInterview?.status === "failed_violation" && (
                <p className="text-xs text-red-500 mt-2">AI interview ended early (tab switch detected).</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyApplications;
