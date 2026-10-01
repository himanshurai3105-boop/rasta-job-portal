import React from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import JobForm from "../components/JobForm.jsx";

const PostJob = () => {
  const navigate = useNavigate();

  const handleSubmit = async (payload) => {
    await api.post("/jobs", payload);
    navigate("/employer/dashboard");
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl">Post a job</h1>
      <p className="text-muted mt-2">Fill in the details — you can edit this later.</p>
      <JobForm onSubmit={handleSubmit} submitLabel="Publish job" loadingLabel="Publishing..." />
    </div>
  );
};

export default PostJob;
