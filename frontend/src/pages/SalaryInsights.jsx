import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../api/axios.js";
import { StatCardSkeleton } from "../components/Skeletons.jsx";

const formatINR = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString()}`;
};

const expLabel = { entry: "Entry", mid: "Mid", senior: "Senior", lead: "Lead" };

const SalaryInsights = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/jobs/salary-insights").then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 md:py-12">
        <div className="skeleton h-8 w-1/3 rounded-md" />
        <div className="grid grid-cols-3 gap-4 mt-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.overall.count === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center text-muted">
        Not enough salary data yet — check back as more jobs are posted.
      </div>
    );
  }

  const expData = data.byExperience.map((r) => ({
    name: expLabel[r.level] || r.level,
    salary: r.avgSalary,
    count: r.count,
  }));
  const locationData = data.topLocations.map((r) => ({ name: r.location, salary: r.avgSalary, count: r.count }));
  const titleData = data.topTitles.map((r) => ({ name: r.title, salary: r.avgSalary, count: r.count }));

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl">Salary insights</h1>
      <p className="text-muted mt-2">Based on {data.overall.count} active listings with salary data.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <div className="p-6 rounded-2xl bg-white border border-ink/10">
          <p className="text-2xl font-display">{formatINR(data.overall.avgMin)}</p>
          <p className="text-sm text-muted mt-1">Average minimum</p>
        </div>
        <div className="p-6 rounded-2xl bg-white border border-ink/10">
          <p className="text-2xl font-display">{formatINR(data.overall.avgMax)}</p>
          <p className="text-sm text-muted mt-1">Average maximum</p>
        </div>
        <div className="p-6 rounded-2xl bg-white border border-ink/10">
          <p className="text-2xl font-display">{data.overall.count}</p>
          <p className="text-sm text-muted mt-1">Listings analyzed</p>
        </div>
      </div>

      {expData.length > 0 && (
        <div className="mt-10 p-6 rounded-2xl bg-white border border-ink/10">
          <h2 className="font-display text-lg mb-4">Average salary by experience level</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={expData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16181D10" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatINR} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatINR(v)} />
              <Bar dataKey="salary" fill="#3B5BDB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {titleData.length > 0 && (
        <div className="mt-6 p-6 rounded-2xl bg-white border border-ink/10">
          <h2 className="font-display text-lg mb-4">Average salary by role</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={titleData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16181D10" />
              <XAxis type="number" tickFormatter={formatINR} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatINR(v)} />
              <Bar dataKey="salary" fill="#E8A33D" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {locationData.length > 0 && (
        <div className="mt-6 p-6 rounded-2xl bg-white border border-ink/10">
          <h2 className="font-display text-lg mb-4">Average salary by location</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={locationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16181D10" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatINR} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatINR(v)} />
              <Bar dataKey="salary" fill="#2F9E68" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-xs text-muted mt-6">
        Figures are averages of employer-entered salary ranges on active listings — not a guarantee of offer amounts.
      </p>
    </div>
  );
};

export default SalaryInsights;
