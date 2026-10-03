import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import JobCard from "../components/JobCard.jsx";
import { JobCardSkeleton } from "../components/Skeletons.jsx";
import AutocompleteInput from "../components/AutocompleteInput.jsx";
import { fetchJobSuggestions, fetchLocationSuggestions } from "../api/suggestions.js";
import { INDUSTRIES } from "../data/industries.js";

const Jobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const keyword = searchParams.get("keyword") || "";
  const location = searchParams.get("location") || "";
  const jobType = searchParams.get("jobType") || "";
  const workMode = searchParams.get("workMode") || "";
  const experienceLevel = searchParams.get("experienceLevel") || "";
  const category = searchParams.get("category") || "";
  const salaryMin = searchParams.get("salaryMin") || "";
  const skills = searchParams.get("skills") || "";
  const page = searchParams.get("page") || "1";

  // Local input state for the autocomplete fields — committed to the URL on
  // Enter, blur, or picking a suggestion, so we don't re-fetch on every keystroke.
  const [keywordInput, setKeywordInput] = useState(keyword);
  const [locationInput, setLocationInput] = useState(location);

  useEffect(() => setKeywordInput(keyword), [keyword]);
  useEffect(() => setLocationInput(location), [location]);

  useEffect(() => {
    setLoading(true);
    api
      .get("/jobs", {
        params: { keyword, location, jobType, workMode, experienceLevel, salaryMin, skills, category, page },
      })
      .then((res) => {
        setJobs(res.data.data);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [keyword, location, jobType, workMode, experienceLevel, salaryMin, skills, category, page]);

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    setSearchParams(params);
  };

  const activeFilterCount = [experienceLevel, salaryMin, skills, category].filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl">Browse openings</h1>
      <p className="text-muted mt-2">
        {loading ? "Searching..." : `${pagination.total} roles found`}
      </p>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-6">
        <div className="w-full sm:w-56">
          <AutocompleteInput
            value={keywordInput}
            onChange={setKeywordInput}
            onSelect={(val) => {
              setKeywordInput(val);
              const params = new URLSearchParams(searchParams);
              params.set("keyword", val);
              params.set("location", locationInput);
              params.set("page", "1");
              setSearchParams(params);
            }}
            fetchOptions={fetchJobSuggestions}
            placeholder="Job title, skill, or company"
            className="w-full px-4 py-2.5 rounded-full border border-ink/10 text-sm focus-ring"
          />
        </div>
        <div className="w-full sm:w-56">
          <AutocompleteInput
            value={locationInput}
            onChange={setLocationInput}
            onSelect={(val) => {
              setLocationInput(val);
              const params = new URLSearchParams(searchParams);
              params.set("keyword", keywordInput);
              params.set("location", val);
              params.set("page", "1");
              setSearchParams(params);
            }}
            fetchOptions={fetchLocationSuggestions}
            placeholder="Location"
            className="w-full px-4 py-2.5 rounded-full border border-ink/10 text-sm focus-ring"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={jobType}
            onChange={(e) => updateFilter("jobType", e.target.value)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-ink/10 text-sm focus-ring bg-white"
          >
            <option value="">Any job type</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
          <select
            value={workMode}
            onChange={(e) => updateFilter("workMode", e.target.value)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-ink/10 text-sm focus-ring bg-white"
          >
            <option value="">Any work mode</option>
            <option value="onsite">On-site</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.set("keyword", keywordInput);
            params.set("location", locationInput);
            params.set("page", "1");
            setSearchParams(params);
          }}
          className="px-5 py-2.5 rounded-full bg-ink text-paper text-sm font-medium hover:bg-amber-dark transition-colors focus-ring"
        >
          Search
        </button>
        <button
          onClick={() => setShowMoreFilters((s) => !s)}
          className="px-4 py-2.5 rounded-full border border-ink/10 text-sm font-medium hover:border-amber transition-colors focus-ring"
        >
          More filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {showMoreFilters && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-3 p-4 rounded-2xl bg-white border border-ink/10">
          <select
            value={category}
            onChange={(e) => updateFilter("category", e.target.value)}
            className="px-4 py-2.5 rounded-full border border-ink/10 text-sm focus-ring bg-white"
          >
            <option value="">Any industry</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
          <select
            value={experienceLevel}
            onChange={(e) => updateFilter("experienceLevel", e.target.value)}
            className="px-4 py-2.5 rounded-full border border-ink/10 text-sm focus-ring bg-white"
          >
            <option value="">Any experience level</option>
            <option value="entry">Entry</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
          </select>
          <input
            type="number"
            placeholder="Min salary (annual)"
            defaultValue={salaryMin}
            onKeyDown={(e) => e.key === "Enter" && updateFilter("salaryMin", e.target.value)}
            onBlur={(e) => updateFilter("salaryMin", e.target.value)}
            className="px-4 py-2.5 rounded-full border border-ink/10 text-sm focus-ring w-full sm:w-44"
          />
          <input
            placeholder="Skills, comma separated"
            defaultValue={skills}
            onKeyDown={(e) => e.key === "Enter" && updateFilter("skills", e.target.value)}
            onBlur={(e) => updateFilter("skills", e.target.value)}
            className="px-4 py-2.5 rounded-full border border-ink/10 text-sm focus-ring flex-1"
          />
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                ["experienceLevel", "salaryMin", "skills", "category"].forEach((k) => params.delete(k));
                params.set("page", "1");
                setSearchParams(params);
              }}
              className="px-4 py-2.5 text-sm text-red-500 hover:underline focus-ring rounded"
            >
              Clear these
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-5 mt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5 mt-8">
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <div className="text-center py-20 text-muted">
          No roles match yet — try a different keyword or clear a filter.
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => updateFilter("page", String(p))}
              className={`w-9 h-9 rounded-full text-sm font-medium focus-ring transition-colors ${
                Number(page) === p ? "bg-ink text-paper" : "bg-white border border-ink/10 hover:border-amber"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Jobs;
