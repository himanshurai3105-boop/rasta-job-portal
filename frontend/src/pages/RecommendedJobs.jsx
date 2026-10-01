import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import JobCard from "../components/JobCard.jsx";
import { JobCardSkeleton } from "../components/Skeletons.jsx";

const RecommendedJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    api
      .get("/jobs/recommended/mine")
      .then((res) => {
        setJobs(res.data.data);
        if (res.data.message) setNote(res.data.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl">Recommended for you</h1>
      <p className="text-muted mt-2">Matched to the skills on your profile.</p>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-5 mt-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : note ? (
        <div className="mt-10 p-10 text-center rounded-2xl bg-white border border-ink/10 text-muted">
          {note}{" "}
          <Link to="/profile" className="text-amber-dark font-medium hover:underline focus-ring rounded">
            Update your profile
          </Link>
        </div>
      ) : jobs.length === 0 ? (
        <div className="mt-10 p-10 text-center rounded-2xl bg-white border border-ink/10 text-muted">
          No close matches yet — check back as more roles are posted, or{" "}
          <Link to="/jobs" className="text-amber-dark font-medium hover:underline focus-ring rounded">
            browse all openings
          </Link>
          .
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5 mt-8">
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendedJobs;
