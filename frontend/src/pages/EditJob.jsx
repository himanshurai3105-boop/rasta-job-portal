import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import JobForm, { jobToFormValues } from "../components/JobForm.jsx";

const EditJob = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get("/jobs/employer/mine")
      .then((res) => {
        const job = res.data.data.find((j) => j._id === id);
        if (!job) {
          setNotFound(true);
          return;
        }
        setInitialValues(jobToFormValues(job));
      })
      .catch(() => setNotFound(true));
  }, [id]);

  const handleSubmit = async (payload) => {
    await api.put(`/jobs/${id}`, payload);
    navigate("/employer/dashboard");
  };

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center text-muted">
        Job not found, or you don't have permission to edit it.
      </div>
    );
  }

  if (!initialValues) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="skeleton h-8 w-1/2 rounded-md" />
        <div className="skeleton h-96 w-full rounded-2xl mt-6" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl">Edit job</h1>
      <p className="text-muted mt-2">Update the listing — candidates will see the latest version.</p>
      <JobForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        loadingLabel="Saving..."
      />
    </div>
  );
};

export default EditJob;
