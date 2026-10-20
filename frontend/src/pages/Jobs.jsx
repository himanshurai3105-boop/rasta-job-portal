import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import JobCard from "../components/JobCard.jsx";
import { JobCardSkeleton } from "../components/Skeletons.jsx";
import AutocompleteInput from "../components/AutocompleteInput.jsx";
import TagAutocompleteInput from "../components/TagAutocompleteInput.jsx";
import {
  fetchJobSuggestions,
  fetchLocationSuggestions,
  fetchSkillSuggestions,
} from "../api/suggestions.js";
import { INDUSTRIES } from "../data/industries.js";

const RECOMMENDED_PREVIEW = 10;

const Jobs = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [recommended, setRecommended] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [recommendedMessage, setRecommendedMessage] = useState("");
  const [showAllRecommended, setShowAllRecommended] = useState(false);

  const keyword = searchParams.get("keyword") || "";
  const location = searchParams.get("location") || "";
  const jobType = searchParams.get("jobType") || "";
  const workMode = searchParams.get("workMode") || "";
  const experienceLevel = searchParams.get("experienceLevel") || "";
  const category = searchParams.get("category") || "";
  const salaryMin = searchParams.get("salaryMin") || "";
  const skills = searchParams.get("skills") || "";
  const page = searchParams.get("page") || "1";

  const skillList = skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Local input state for the autocomplete fields — committed to the URL on
  // Enter, blur, or picking a suggestion, so we don't re-fetch on every keystroke.
  const [keywordInput, setKeywordInput] = useState(keyword);
  const [locationInput, setLocationInput] = useState(location);

  useEffect(() => setKeywordInput(keyword), [keyword]);
  useEffect(() => setLocationInput(location), [location]);

  // Recommended jobs (sirf jobseeker ke liye)
  useEffect(() => {
    if (user?.role !== "jobseeker") return;
    setRecommendedLoading(true);
    api
      .get("/jobs/recommended/mine")
      .then((res) => {
        setRecommended(res.data.data || []);
        setRecommendedMessage(res.data.message || "");
      })
      .catch(() => setRecommended([]))
      .finally(() => setRecommendedLoading(false));
  }, [user?._id, user?.role]);

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

  const hasAnyFilter = Boolean(
    keyword || location || jobType || workMode || experienceLevel || category || salaryMin || skills
  );
  const showRecommended = user?.role === "jobseeker" && !hasAnyFilter && page === "1";

  const visibleRecommended = showAllRecommended ? recommended : recommended.slice(0, RECOMMENDED_PREVIEW);
  const hasUserCoords = user?.coordinates?.lat != null && user?.coordinates?.lng != null;

  const locationBadge = {
    preferred: "Your preferred city",
    near: "Near you",
    remote: "Remote",
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 md:py-12">
      {/* Recommended for you */}
      {showRecommended && (
        <section className="mb-12">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl md:text-3xl">Recommended for you</h2>
              <p className="text-muted mt-1 text-sm">
                Up to 25 jobs matched to your location, preferred cities, skills and role.
              </p>
            </div>
            <Link to="/profile" className="text-xs text-amber-dark hover:underline focus-ring rounded shrink-0">
              Update profile
            </Link>
          </div>

          {!hasUserCoords && (
            <p className="mt-3 text-xs text-muted">
              Save your location in your{" "}
              <Link to="/profile" className="text-amber-dark hover:underline">
                profile
              </Link>{" "}
              to see jobs near you with distance in km.
            </p>
          )}

          {recommendedLoading ? (
            <div className="grid sm:grid-cols-2 gap-5 mt-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <JobCardSkeleton key={i} />
              ))}
            </div>
          ) : recommended.length === 0 ? (
            <div className="mt-6 p-6 rounded-2xl bg-white border border-ink/10 text-sm text-muted">
              {recommendedMessage ||
                "No close matches yet. Add more skills or preferred cities in your profile to see recommendations."}{" "}
              <Link to="/profile" className="text-amber-dark font-medium hover:underline">
                Go to profile
              </Link>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-5 mt-6">
                {visibleRecommended.map((job) => (
                  <div key={job._id}>
                    <JobCard job={job} />
                    <div className="mt-2 px-4 py-3 rounded-xl bg-amber/10 border border-amber/30 text-xs space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-amber-dark">{job.matchPercent}% match</span>
                        {locationBadge[job.locationMatch] && (
                          <span className="px-2 py-0.5 rounded-full bg-white border border-amber/40 text-amber-dark">
                            {locationBadge[job.locationMatch]}
                          </span>
                        )}
                      </div>
                      {job.matchReasons?.length > 0 && (
                        <p className="text-muted">{job.matchReasons.join(" · ")}</p>
                      )}
                      {job.missingSkills?.length > 0 && (
                        <p className="text-muted">
                          <span className="font-medium text-ink">Company also needs:</span>{" "}
                          {job.missingSkills.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {recommended.length > RECOMMENDED_PREVIEW && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setShowAllRecommended((s) => !s)}
                    className="px-5 py-2.5 rounded-full border border-ink/10 text-sm font-medium hover:border-amber transition-colors focus-ring"
                  >
                    {showAllRecommended
                      ? "Show fewer"
                      : `Show all ${recommended.length} recommended jobs`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

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
        <div className="w-full sm:w-64">
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
            maxResults={12}
            placeholder="Location (city, area, sector)"
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
          <div className="w-full sm:flex-1 sm:min-w-[16rem]">
            <TagAutocompleteInput
              values={skillList}
              onChange={(vals) => updateFilter("skills", vals.join(","))}
              fetchOptions={fetchSkillSuggestions}
              maxResults={10}
              placeholder="Skills (type to search, e.g. React, Excel)"
              helperText=""
            />
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                ["experienceLevel", "salaryMin", "skills", "category"].forEach((k) => params.delete(k));
                params.set("page", "1");
                setSearchParams(params);
              }}
              className="px-4 py-2.5 text-sm text-red-500 hover:underline focus-ring rounded self-start"
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