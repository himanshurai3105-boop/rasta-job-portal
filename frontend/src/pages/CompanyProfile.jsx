import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios.js";
import JobCard from "../components/JobCard.jsx";
import { JobCardSkeleton } from "../components/Skeletons.jsx";
import ReportButton from "../components/ReportButton.jsx";

const CompanyProfile = () => {
  const { employerId } = useParams();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/jobs/company/${employerId}`)
      .then((res) => {
        setCompany(res.data.data.company);
        setJobs(res.data.data.jobs);
      })
      .catch((err) => setError(err.response?.data?.message || "Company not found"))
      .finally(() => setLoading(false));
  }, [employerId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="skeleton h-10 w-1/2 rounded-md" />
        <div className="skeleton h-24 w-full rounded-2xl mt-6" />
      </div>
    );
  }

  if (error) {
    return <div className="max-w-4xl mx-auto px-6 py-12 text-center text-muted">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 md:py-12">
      <div className="flex items-center gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-amber-dark">Company</p>
        {company.isVerified && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            Verified
          </span>
        )}
      </div>
      <h1 className="font-display text-3xl md:text-4xl mt-2">{company.companyName}</h1>
      {company.companyWebsite && (
        <a
          href={company.companyWebsite}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-slateblue hover:underline mt-2 inline-block"
        >
          {company.companyWebsite}
        </a>
      )}
      {company.companyDescription && (
        <p className="text-ink/80 mt-4 whitespace-pre-line">{company.companyDescription}</p>
      )}

      <div className="mt-10">
        <h2 className="font-display text-2xl">Open roles ({jobs.length})</h2>
        {jobs.length === 0 ? (
          <p className="text-muted mt-4">No active openings right now — check back later.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5 mt-6">
            {jobs.map((job) => (
              <JobCard key={job._id} job={{ ...job, companyName: company.companyName }} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <ReportButton targetType="user" targetId={company._id} label="Report this company" />
      </div>
    </div>
  );
};

export default CompanyProfile;
