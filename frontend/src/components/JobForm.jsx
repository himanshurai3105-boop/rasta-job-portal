import React, { useState } from "react";
import { INDUSTRIES } from "../data/industries.js";
import { EDUCATION_LEVELS } from "../data/education.js";
import AutocompleteInput from "./AutocompleteInput.jsx";
import TagAutocompleteInput from "./TagAutocompleteInput.jsx";
import { fetchLocationSuggestions, fetchSkillSuggestions } from "../api/suggestions.js";

const emptyRules = {
  noticePeriod: "",
  shiftTiming: "",
  workingDays: "",
  dressCode: "",
  probationPeriod: "",
  bondDetails: "",
  otherRules: "",
};

export const emptyJobForm = {
  title: "",
  description: "",
  location: "",
  workMode: "onsite",
  jobType: "full-time",
  experienceLevel: "entry",
  salaryMin: "",
  salaryMax: "",
  skills: [],
  requirements: "",
  category: "",
  minEducation: "",
  minExpValue: "",
  minExpUnit: "months",
  rules: { ...emptyRules },
  isFeatured: false,
  isUrgent: false,
};

export const jobToFormValues = (job) => {
  const months = job.minExperienceMonths || 0;
  let minExpUnit = "months";
  let minExpValue = months > 0 ? String(months) : "";
  if (months >= 12 && months % 12 === 0) {
    minExpUnit = "years";
    minExpValue = String(months / 12);
  }

  return {
    title: job.title || "",
    description: job.description || "",
    location: job.location || "",
    workMode: job.workMode || "onsite",
    jobType: job.jobType || "full-time",
    experienceLevel: job.experienceLevel || "entry",
    salaryMin: job.salaryMin || "",
    salaryMax: job.salaryMax || "",
    skills: job.skills || [],
    requirements: (job.requirements || []).join("\n"),
    category: job.category && job.category !== "General" ? job.category : "",
    minEducation: job.minEducation || "",
    minExpValue,
    minExpUnit,
    rules: { ...emptyRules, ...(job.companyRules || {}) },
    isFeatured: job.isFeatured || false,
    isUrgent: job.isUrgent || false,
  };
};

export const formValuesToPayload = (form) => {
  const skills = Array.isArray(form.skills)
    ? form.skills
    : String(form.skills || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const expValue = Number(form.minExpValue) || 0;
  const minExperienceMonths =
    expValue > 0 ? Math.round(form.minExpUnit === "years" ? expValue * 12 : expValue) : 0;

  const companyRules = {};
  Object.keys(emptyRules).forEach((key) => {
    companyRules[key] = String(form.rules?.[key] || "").trim();
  });

  return {
    title: form.title.trim(),
    description: form.description,
    location: form.location.trim(),
    workMode: form.workMode,
    jobType: form.jobType,
    experienceLevel: form.experienceLevel,
    salaryMin: Number(form.salaryMin) || 0,
    salaryMax: Number(form.salaryMax) || 0,
    skills,
    requirements: form.requirements.split("\n").map((s) => s.trim()).filter(Boolean),
    category: form.category,
    minEducation: form.minEducation || "",
    minExperienceMonths,
    companyRules,
    isFeatured: form.isFeatured,
    isUrgent: form.isUrgent,
  };
};

const INPUT = "w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring";

const JobForm = ({ initialValues, onSubmit, submitLabel, loadingLabel }) => {
  const [form, setForm] = useState(initialValues || emptyJobForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const updateRule = (key) => (e) =>
    setForm((prev) => ({ ...prev, rules: { ...prev.rules, [key]: e.target.value } }));
  const toggle = (field) => () => setForm({ ...form, [field]: !form[field] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.location.trim()) {
      setError("Please enter the job location.");
      return;
    }

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
          <input required value={form.title} onChange={update("title")} className={INPUT} />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea required rows={5} value={form.description} onChange={update("description")} className={INPUT} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Location</label>
            <div className="mt-1">
              <AutocompleteInput
                value={form.location}
                onChange={(val) => setField("location", val)}
                fetchOptions={fetchLocationSuggestions}
                maxResults={12}
                placeholder="e.g. Noida, Uttar Pradesh"
                className="w-full px-4 py-3 rounded-xl border border-ink/10 focus-ring"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Work mode</label>
            <select value={form.workMode} onChange={update("workMode")} className={`${INPUT} bg-white`}>
              <option value="onsite">On-site</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Job type</label>
            <select value={form.jobType} onChange={update("jobType")} className={`${INPUT} bg-white`}>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Experience level</label>
            <select value={form.experienceLevel} onChange={update("experienceLevel")} className={`${INPUT} bg-white`}>
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
            <input type="number" value={form.salaryMin} onChange={update("salaryMin")} className={INPUT} />
          </div>
          <div>
            <label className="text-sm font-medium">Max salary (annual)</label>
            <input type="number" value={form.salaryMax} onChange={update("salaryMax")} className={INPUT} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Industry / category</label>
          <select value={form.category} onChange={update("category")} className={`${INPUT} bg-white`}>
            <option value="">Select an industry...</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
          <p className="text-xs text-muted mt-1">Helps match this job to jobseekers with the same preference.</p>
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Skills</label>
          <TagAutocompleteInput
            values={form.skills}
            onChange={(vals) => setField("skills", vals)}
            fetchOptions={fetchSkillSuggestions}
            maxResults={10}
            placeholder="e.g. React, Sales, Excel..."
          />
        </div>
        <div>
          <label className="text-sm font-medium">Requirements (one per line)</label>
          <textarea rows={4} value={form.requirements} onChange={update("requirements")} className={INPUT} />
        </div>

        {/* Company ki zaroorat */}
        <div className="pt-4 mt-2 border-t border-ink/10">
          <h2 className="font-display text-lg">Minimum eligibility</h2>
          <p className="text-xs text-muted mt-1">
            Optional. Candidates see this, and AI uses it to tell them how well they fit.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Minimum qualification</label>
            <select value={form.minEducation} onChange={update("minEducation")} className={`${INPUT} bg-white`}>
              <option value="">No minimum</option>
              {EDUCATION_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Minimum experience</label>
            <div className="flex gap-3 mt-1">
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.minExpValue}
                onChange={update("minExpValue")}
                placeholder="0 = fresher OK"
                className="w-full px-4 py-3 rounded-xl border border-ink/10 focus-ring"
              />
              <select
                value={form.minExpUnit}
                onChange={update("minExpUnit")}
                className="px-3 py-3 rounded-xl border border-ink/10 focus-ring bg-white"
              >
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          </div>
        </div>

        {/* Company rules */}
        <div className="pt-4 mt-2 border-t border-ink/10">
          <h2 className="font-display text-lg">Company rules and policies</h2>
          <p className="text-xs text-muted mt-1">
            Optional. Be clear about your rules so the right candidates apply.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Notice period</label>
            <input value={form.rules.noticePeriod} onChange={updateRule("noticePeriod")} placeholder="e.g. 30 days" className={INPUT} />
          </div>
          <div>
            <label className="text-sm font-medium">Shift timing</label>
            <input value={form.rules.shiftTiming} onChange={updateRule("shiftTiming")} placeholder="e.g. 9:30 AM to 6:30 PM" className={INPUT} />
          </div>
          <div>
            <label className="text-sm font-medium">Working days</label>
            <input value={form.rules.workingDays} onChange={updateRule("workingDays")} placeholder="e.g. Monday to Saturday" className={INPUT} />
          </div>
          <div>
            <label className="text-sm font-medium">Dress code</label>
            <input value={form.rules.dressCode} onChange={updateRule("dressCode")} placeholder="e.g. Formal on weekdays" className={INPUT} />
          </div>
          <div>
            <label className="text-sm font-medium">Probation period</label>
            <input value={form.rules.probationPeriod} onChange={updateRule("probationPeriod")} placeholder="e.g. 3 months" className={INPUT} />
          </div>
          <div>
            <label className="text-sm font-medium">Bond / agreement</label>
            <input value={form.rules.bondDetails} onChange={updateRule("bondDetails")} placeholder="e.g. 1 year service agreement, or None" className={INPUT} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Other rules</label>
          <textarea
            rows={3}
            value={form.rules.otherRules}
            onChange={updateRule("otherRules")}
            placeholder="e.g. Laptop provided, 2 days work from office, leave policy..."
            className={INPUT}
          />
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