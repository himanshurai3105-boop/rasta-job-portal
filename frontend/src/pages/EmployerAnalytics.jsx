import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import api from "../api/axios.js";
import { StatCardSkeleton } from "../components/Skeletons.jsx";

const STATUS_LABELS = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview: "Interview",
  rejected: "Rejected",
  hired: "Hired",
};

const EmployerAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/applications/employer/analytics").then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 md:py-12">
        <div className="skeleton h-8 w-1/3 rounded-md" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const statusData = Object.entries(data.statusBreakdown).map(([key, value]) => ({
    name: STATUS_LABELS[key] || key,
    count: value,
  }));

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl">Recruitment analytics</h1>
      <p className="text-muted mt-2">How your job postings are performing.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <div className="p-5 rounded-2xl bg-white border border-ink/10">
          <p className="text-3xl font-display">{data.totalJobs}</p>
          <p className="text-sm text-muted mt-1">Total jobs posted</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-ink/10">
          <p className="text-3xl font-display">{data.activeJobs}</p>
          <p className="text-sm text-muted mt-1">Active postings</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-ink/10">
          <p className="text-3xl font-display">{data.totalApplications}</p>
          <p className="text-sm text-muted mt-1">Total applications</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-ink/10">
          <p className="text-3xl font-display">{data.totalViews}</p>
          <p className="text-sm text-muted mt-1">Total job views</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-10">
        <div className="p-6 rounded-2xl bg-white border border-ink/10">
          <h2 className="font-display text-lg mb-4">Applications by status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16181D10" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#E8A33D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-ink/10">
          <h2 className="font-display text-lg mb-4">Applications — last 14 days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.applicationsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16181D10" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3B5BDB" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl">Top performing jobs</h2>
        {data.topJobs.length === 0 ? (
          <p className="text-muted mt-3">Post a job to see performance here.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.topJobs.map((job, i) => (
              <div key={i} className="p-4 rounded-xl bg-white border border-ink/10 flex items-center justify-between">
                <p className="font-medium truncate">{job.title}</p>
                <p className="text-sm text-muted shrink-0">
                  {job.applicationsCount} applicants · {job.viewsCount} views
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployerAnalytics;
