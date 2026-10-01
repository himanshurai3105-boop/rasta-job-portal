import React, { useEffect, useState } from "react";
import api from "../api/axios.js";
import { StatCardSkeleton, RowSkeleton } from "../components/Skeletons.jsx";

const reasonLabel = {
  spam: "Spam",
  misleading: "Misleading",
  inappropriate: "Inappropriate",
  scam: "Scam",
  other: "Other",
};

const AdminDashboard = () => {
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/stats").then((res) => setStats(res.data.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const endpoints = {
      users: "/admin/users",
      jobs: "/admin/jobs",
      companies: "/admin/companies",
      applications: "/admin/applications",
      reports: "/admin/reports",
    };
    if (!endpoints[tab]) {
      setLoading(false);
      return;
    }
    api
      .get(endpoints[tab])
      .then((res) => {
        if (tab === "users") setUsers(res.data.data);
        if (tab === "jobs") setJobs(res.data.data);
        if (tab === "companies") setCompanies(res.data.data);
        if (tab === "applications") setApplications(res.data.data);
        if (tab === "reports") setReports(res.data.data);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  const reloadTab = () => {
    const endpoints = {
      users: () => api.get("/admin/users").then((res) => setUsers(res.data.data)),
      jobs: () => api.get("/admin/jobs").then((res) => setJobs(res.data.data)),
      companies: () => api.get("/admin/companies").then((res) => setCompanies(res.data.data)),
      reports: () => api.get("/admin/reports").then((res) => setReports(res.data.data)),
    };
    endpoints[tab]?.();
  };

  const toggleBlock = async (id) => {
    await api.put(`/admin/users/${id}/block`);
    reloadTab();
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Permanently delete this account? This cannot be undone.")) return;
    await api.delete(`/admin/users/${id}`);
    reloadTab();
  };

  const toggleJobStatus = async (job) => {
    const newStatus = job.status === "active" ? "closed" : "active";
    await api.put(`/admin/jobs/${job._id}/status`, { status: newStatus });
    reloadTab();
  };

  const toggleVerify = async (id) => {
    await api.put(`/admin/companies/${id}/verify`);
    reloadTab();
  };

  const updateReport = async (id, status) => {
    await api.put(`/admin/reports/${id}`, { status });
    reloadTab();
  };

  const tabs = ["stats", "users", "companies", "jobs", "applications", "reports"];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl">Admin</h1>

      <div className="flex gap-2 mt-6 p-1 bg-ink/5 rounded-xl w-full overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors whitespace-nowrap focus-ring shrink-0 ${
              tab === t ? "bg-white shadow-sm" : "text-muted"
            }`}
          >
            {t}
            {t === "reports" && stats?.pendingReports > 0 && (
              <span className="ml-1.5 text-xs bg-amber text-ink px-1.5 py-0.5 rounded-full">
                {stats.pendingReports}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "stats" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {stats
            ? Object.entries(stats).map(([key, value]) => (
                <div key={key} className="p-6 rounded-2xl bg-white border border-ink/10">
                  <p className="text-3xl font-display">{value}</p>
                  <p className="text-sm text-muted mt-1 capitalize">
                    {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                  </p>
                </div>
              ))
            : Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      )}

      {tab === "users" && (
        <div className="mt-8 space-y-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
            : users.map((u) => (
                <div
                  key={u._id}
                  className="p-4 rounded-xl bg-white border border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {u.name} <span className="text-muted font-normal">— {u.role}</span>
                    </p>
                    <p className="text-sm text-muted truncate">{u.email}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => toggleBlock(u._id)}
                      className={`text-sm font-medium px-3 py-2 rounded-lg border focus-ring transition-colors ${
                        u.isBlocked ? "border-success text-success" : "border-red-300 text-red-600"
                      }`}
                    >
                      {u.isBlocked ? "Unblock" : "Block"}
                    </button>
                    {u.role !== "admin" && (
                      <button
                        onClick={() => deleteUser(u._id)}
                        className="text-sm font-medium px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 focus-ring transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
        </div>
      )}

      {tab === "companies" && (
        <div className="mt-8 space-y-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
            : companies.map((c) => (
                <div
                  key={c._id}
                  className="p-4 rounded-xl bg-white border border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{c.companyName || c.name}</p>
                      {c.isVerified && (
                        <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full shrink-0">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted truncate">
                      {c.email} · {c.jobCount} job(s) posted
                    </p>
                  </div>
                  <button
                    onClick={() => toggleVerify(c._id)}
                    className={`shrink-0 text-sm font-medium px-3 py-2 rounded-lg border focus-ring transition-colors ${
                      c.isVerified ? "border-ink/10 hover:border-red-300 hover:text-red-500" : "border-amber text-amber-dark hover:bg-amber/10"
                    }`}
                  >
                    {c.isVerified ? "Unverify" : "Verify"}
                  </button>
                </div>
              ))}
        </div>
      )}

      {tab === "jobs" && (
        <div className="mt-8 space-y-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
            : jobs.map((job) => (
                <div
                  key={job._id}
                  className="p-4 rounded-xl bg-white border border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{job.title}</p>
                    <p className="text-sm text-muted">{job.employer?.companyName} · {job.status}</p>
                  </div>
                  <button
                    onClick={() => toggleJobStatus(job)}
                    className="shrink-0 w-fit text-sm font-medium px-3 py-2 rounded-lg border border-ink/10 hover:border-amber transition-colors focus-ring"
                  >
                    {job.status === "active" ? "Close" : "Reopen"}
                  </button>
                </div>
              ))}
        </div>
      )}

      {tab === "applications" && (
        <div className="mt-8 space-y-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
            : applications.map((app) => (
                <div key={app._id} className="p-4 rounded-xl bg-white border border-ink/10">
                  <p className="font-medium">
                    {app.applicant?.name} → {app.job?.title}
                  </p>
                  <p className="text-sm text-muted mt-1">
                    {app.applicant?.email} · {app.job?.companyName} · status: {app.status}
                  </p>
                </div>
              ))}
        </div>
      )}

      {tab === "reports" && (
        <div className="mt-8 space-y-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
            : reports.length === 0
            ? <p className="text-muted text-center py-10">No reports filed.</p>
            : reports.map((r) => (
                <div key={r._id} className="p-4 rounded-xl bg-white border border-ink/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {r.targetType === "job" ? r.targetJob?.title : r.targetUser?.name}{" "}
                        <span className="text-xs font-mono uppercase text-muted">({r.targetType})</span>
                      </p>
                      <p className="text-sm text-muted mt-1">
                        Reason: {reasonLabel[r.reason]} · by {r.reporter?.name}
                      </p>
                      {r.description && <p className="text-sm text-ink/70 mt-1 italic">"{r.description}"</p>}
                    </div>
                    <span
                      className={`text-xs font-mono uppercase px-2.5 py-1 rounded-full shrink-0 ${
                        r.status === "pending"
                          ? "bg-amber/10 text-amber-dark"
                          : r.status === "resolved"
                          ? "bg-success/10 text-success"
                          : "bg-ink/10 text-ink/60"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => updateReport(r._id, "resolved")}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-success text-success hover:bg-success/10 focus-ring transition-colors"
                      >
                        Mark resolved
                      </button>
                      <button
                        onClick={() => updateReport(r._id, "dismissed")}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-ink/10 hover:border-ink/30 focus-ring transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
