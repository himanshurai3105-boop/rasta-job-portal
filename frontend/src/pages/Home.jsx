import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AutocompleteInput from "../components/AutocompleteInput.jsx";
import JobCard from "../components/JobCard.jsx";
import api from "../api/axios.js";
import { fetchJobSuggestions, fetchLocationSuggestions } from "../api/suggestions.js";

const Home = () => {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/jobs/featured").then((res) => setFeaturedJobs(res.data.data)).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (location) params.set("location", location);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-20 pb-16">
        <p className="hero-enter hero-enter-1 font-mono text-xs uppercase tracking-widest text-amber-dark mb-4">
          For job seekers &amp; employers
        </p>
        <h1 className="hero-enter hero-enter-2 font-display text-4xl sm:text-5xl md:text-7xl leading-[1.05] max-w-3xl">
          Find work that fits, <span className="italic text-amber-dark">not just work.</span>
        </h1>
        <p className="hero-enter hero-enter-3 text-lg text-muted mt-6 max-w-xl">
          Search real openings, apply in a click, and track every application
          from one place. No noise, no dead listings.
        </p>

        <form
          onSubmit={handleSearch}
          className="hero-enter hero-enter-4 mt-10 bg-white rounded-2xl border border-ink/10 p-2 flex flex-col sm:flex-row gap-2 max-w-2xl shadow-sm"
        >
          <AutocompleteInput
            value={keyword}
            onChange={setKeyword}
            fetchOptions={fetchJobSuggestions}
            placeholder="Job title, skill, or company — e.g. React developer"
            className="w-full flex-1 px-4 py-3 rounded-xl focus-ring bg-transparent"
          />
          <AutocompleteInput
            value={location}
            onChange={setLocation}
            fetchOptions={fetchLocationSuggestions}
            placeholder="Location"
            className="w-full sm:w-44 px-4 py-3 rounded-xl focus-ring bg-transparent border-t sm:border-t-0 sm:border-l border-ink/10"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-ink text-paper font-medium hover:bg-amber-dark transition-colors focus-ring"
          >
            Search jobs
          </button>
        </form>
      </section>

      {/* Signature runway divider */}
      <div className="runway max-w-6xl mx-auto" />

      {/* Featured / urgent jobs */}
      {featuredJobs.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl">Featured &amp; urgent roles</h2>
            <Link to="/jobs" className="text-sm font-medium text-amber-dark hover:underline focus-ring rounded">
              See all jobs →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 mt-6">
            {featuredJobs.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>
        </section>
      )}

      {/* For employers / seekers split */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-8">
        <div className="p-8 rounded-2xl bg-ink text-paper">
          <span className="font-mono text-xs uppercase tracking-widest text-amber">Job seekers</span>
          <h2 className="font-display text-3xl mt-3">Apply once, track everywhere.</h2>
          <p className="text-paper/70 mt-3">
            Build a profile, apply to roles that match your skills, and follow
            every application's status without chasing emails.
          </p>
          <a href="/register" className="inline-block mt-6 text-amber font-medium hover:underline focus-ring rounded">
            Create your profile →
          </a>
        </div>
        <div className="p-8 rounded-2xl bg-white border border-ink/10">
          <span className="font-mono text-xs uppercase tracking-widest text-slateblue">Employers</span>
          <h2 className="font-display text-3xl mt-3">Post a role in minutes.</h2>
          <p className="text-muted mt-3">
            Publish openings, review applicants with the context you need, and
            move candidates through your pipeline — shortlist to hire.
          </p>
          <a href="/register" className="inline-block mt-6 text-slateblue font-medium hover:underline focus-ring rounded">
            Post your first job →
          </a>
        </div>
      </section>
    </div>
  );
};

export default Home;
