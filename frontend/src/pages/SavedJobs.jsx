import React, { useEffect, useState } from "react";
import api from "../api/axios.js";
import JobCard from "../components/JobCard.jsx";
import { JobCardSkeleton } from "../components/Skeletons.jsx";

const SavedJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/jobs/saved/mine").then((res) => setJobs(res.data.data)).finally(() => setLoading(false));
  }, []);

  const handleUnsave = (jobId) => {
    setJobs((prev) => prev.filter((j) => j._id !== jobId));
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl">Saved jobs</h1>
      <p className="text-muted mt-2">Roles you've bookmarked to revisit later.</p>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-5 mt-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="mt-10 p-10 text-center rounded-2xl bg-white border border-ink/10 text-muted">
          Nothing saved yet — tap the bookmark icon on any job to add it here.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5 mt-8">
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} initiallySaved onUnsave={handleUnsave} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedJobs;
