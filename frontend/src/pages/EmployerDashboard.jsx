import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { RowSkeleton } from "../components/Skeletons.jsx";

const statusColor = {
  active: "bg-success/10 text-success",
  closed: "bg-ink/10 text-ink/60",
  pending_review: "bg-amber/10 text-amber-dark",
};

const EmployerDashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get("/jobs/employer/mine").then((res) => setJobs(res.data.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleStatus = async (job) => {
    const newStatus = job.status === "active" ? "closed" : "active";
    await api.put(`/jobs/${job._id}`, { status: newStatus });
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 md:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">My postings</h1>
          <p className="text-muted mt-2">Manage your job listings and see applicants.</p>
        </div>
        <Link
          to="/employer/post"
          className="shrink-0 text-center px-5 py-3 rounded-xl bg-ink text-paper font-medium hover:bg-amber-dark transition-colors focus-ring"
        >
          + Post a job
        </Link>
      </div>

      <div className="flex gap-4 mt-5 text-sm">
        <Link to="/employer/analytics" className="text-slateblue font-medium hover:underline focus-ring rounded">
          View analytics
        </Link>
        <Link to="/employer/candidates" className="text-slateblue font-medium hover:underline focus-ring rounded">
          Search candidates
        </Link>
      </div>

      {loading ? (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="mt-10 p-10 text-center rounded-2xl bg-white border border-ink/10 text-muted">
          Nothing posted yet — publish your first role to start receiving applicants.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="p-5 rounded-2xl bg-white border border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <h3 className="font-display text-lg truncate">{job.title}</h3>
                <p className="text-sm text-muted mt-1">
                  {job.location} · {job.applicationsCount} applicant(s) · {job.viewsCount} view(s)
                </p>
              </div>
              <div className="flex items-center flex-wrap gap-3 shrink-0">
                <span className={`text-xs font-mono uppercase px-2.5 py-1 rounded-full ${statusColor[job.status]}`}>
                  {job.status.replace("_", " ")}
                </span>
                <Link
                  to={`/employer/jobs/${job._id}/applicants`}
                  className="text-sm font-medium text-slateblue hover:underline focus-ring rounded"
                >
                  View applicants
                </Link>
                <Link
                  to={`/employer/jobs/${job._id}/edit`}
                  className="text-sm font-medium text-ink/70 hover:underline focus-ring rounded"
                >
                  Edit
                </Link>
                <button
                  onClick={() => toggleStatus(job)}
                  className="text-sm font-medium px-3 py-2 rounded-lg border border-ink/10 hover:border-amber transition-colors focus-ring"
                >
                  {job.status === "active" ? "Close" : "Reopen"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployerDashboard;
