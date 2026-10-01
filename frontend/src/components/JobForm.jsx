import React, { useState } from "react";

export const emptyJobForm = {
  title: "",
  description: "",
  location: "",
  workMode: "onsite",
  jobType: "full-time",
  experienceLevel: "entry",
  salaryMin: "",
  salaryMax: "",
  skills: "",
  requirements: "",
  isFeatured: false,
  isUrgent: false,
};

export const jobToFormValues = (job) => ({
  title: job.title || "",
  description: job.description || "",
  location: job.location || "",
  workMode: job.workMode || "onsite",
  jobType: job.jobType || "full-time",
  experienceLevel: job.experienceLevel || "entry",
  salaryMin: job.salaryMin || "",
  salaryMax: job.salaryMax || "",
  skills: (job.skills || []).join(", "),
  requirements: (job.requirements || []).join("\n"),
  isFeatured: job.isFeatured || false,
  isUrgent: job.isUrgent || false,
});

export const formValuesToPayload = (form) => ({
  ...form,
  salaryMin: Number(form.salaryMin) || 0,
  salaryMax: Number(form.salaryMax) || 0,
  skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
  requirements: form.requirements.split("\n").map((s) => s.trim()).filter(Boolean),
});

const JobForm = ({ initialValues, onSubmit, submitLabel, loadingLabel }) => {
  const [form, setForm] = useState(initialValues || emptyJobForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const toggle = (field) => () => setForm({ ...form, [field]: !form[field] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit(formValuesToPayload(form));
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <div className="mt-6 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium">Job title</label>
          <input required value={form.title} onChange={update("title")} className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring" />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea required rows={5} value={form.description} onChange={update("description")} className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Location</label>
            <input required value={form.location} onChange={update("location")} className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring" />
          </div>
          <div>
            <label className="text-sm font-medium">Work mode</label>
            <select value={form.workMode} onChange={update("workMode")} className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring bg-white">
              <option value="onsite">On-site</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Job type</label>
            <select value={form.jobType} onChange={update("jobType")} className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring bg-white">
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Experience level</label>
            <select value={form.experienceLevel} onChange={update("experienceLevel")} className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring bg-white">
              <option value="entry">Entry</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Min salary (annual)</label>
            <input type="number" value={form.salaryMin} onChange={update("salaryMin")} className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring" />
          </div>
          <div>
            <label className="text-sm font-medium">Max salary (annual)</label>
            <input type="number" value={form.salaryMax} onChange={update("salaryMax")} className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Skills (comma separated)</label>
          <input placeholder="React, Node.js, MongoDB" value={form.skills} onChange={update("skills")} className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring" />
        </div>
        <div>
          <label className="text-sm font-medium">Requirements (one per line)</label>
          <textarea rows={4} value={form.requirements} onChange={update("requirements")} className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring" />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={toggle("isFeatured")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors focus-ring ${
              form.isFeatured ? "border-amber bg-amber/10 text-amber-dark" : "border-ink/10 hover:border-amber"
            }`}
          >
            <span>{form.isFeatured ? "★" : "☆"}</span> Mark as featured
          </button>
          <button
            type="button"
            onClick={toggle("isUrgent")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors focus-ring ${
              form.isUrgent ? "border-red-400 bg-red-50 text-red-600" : "border-ink/10 hover:border-red-300"
            }`}
          >
            <span>🔥</span> Urgent hiring
          </button>
        </div>

        <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-ink text-paper font-medium hover:bg-amber-dark transition-colors focus-ring disabled:opacity-50">
          {loading ? loadingLabel : submitLabel}
        </button>
      </form>
    </>
  );
};

export default JobForm;
