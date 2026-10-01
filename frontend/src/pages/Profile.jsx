import React, { useEffect, useState } from "react";
import api, { SERVER_ORIGIN } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import TagAutocompleteInput from "../components/TagAutocompleteInput.jsx";
import { fetchLocationSuggestions } from "../api/suggestions.js";

const Profile = () => {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        headline: user.headline || "",
        skills: (user.skills || []).join(", "),
        experienceYears: user.experienceYears || 0,
        location: user.location || "",
        desiredRole: user.desiredRole || "",
        preferredLocations: user.preferredLocations || [],
        preferredJobTypes: user.preferredJobTypes || [],
        preferredWorkModes: user.preferredWorkModes || [],
        companyName: user.companyName || "",
        companyWebsite: user.companyWebsite || "",
        companyDescription: user.companyDescription || "",
      });
    }
  }, [user]);

  const calculateCompletion = () => {
    if (!user) return 0;
    const jobseekerFields = ["name", "phone", "headline", "skills", "resumeUrl", "experienceYears", "location"];
    const employerFields = ["name", "phone", "companyName", "companyWebsite", "companyDescription", "companyLogoUrl"];
    const fields = user.role === "employer" ? employerFields : jobseekerFields;

    const filled = fields.filter((f) => {
      const val = user[f];
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === "number") return val > 0;
      return !!val;
    }).length;

    return Math.round((filled / fields.length) * 100);
  };

  const completion = calculateCompletion();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const toggleListValue = (field, value) => {
    setForm((prev) => {
      const current = prev[field] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        location: form.location,
      };
      if (user.role === "jobseeker") {
        payload.headline = form.headline;
        payload.experienceYears = Number(form.experienceYears) || 0;
        payload.skills = form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        payload.desiredRole = form.desiredRole;
        payload.preferredLocations = form.preferredLocations;
        payload.preferredJobTypes = form.preferredJobTypes;
        payload.preferredWorkModes = form.preferredWorkModes;
      } else if (user.role === "employer") {
        payload.companyName = form.companyName;
        payload.companyWebsite = form.companyWebsite;
        payload.companyDescription = form.companyDescription;
      }

      const res = await api.put("/auth/me", payload);
      setUser((prev) => ({ ...prev, ...res.data.data }));
      setMessage("Profile updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError("");
    if (!file) {
      setResumeFile(null);
      return;
    }
    const allowedExt = [".pdf", ".doc", ".docx"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExt.includes(ext)) {
      setFileError("Only PDF, DOC, or DOCX files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("File must be under 5MB");
      return;
    }
    setResumeFile(file);
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) return;
    setUploadingResume(true);
    setFileError("");
    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      const res = await api.post("/auth/me/resume", formData);
      setUser((prev) => ({ ...prev, resumeUrl: res.data.data.resumeUrl }));
      setResumeFile(null);
    } catch (err) {
      setFileError(err.response?.data?.message || "Could not upload resume");
    } finally {
      setUploadingResume(false);
    }
  };

  if (!user || !form) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="skeleton h-8 w-1/3 rounded-md" />
        <div className="skeleton h-64 w-full rounded-2xl mt-6" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl">Your profile</h1>
      <p className="text-muted mt-2">
        {user.role === "employer"
          ? "Keep your company details current — candidates see this on your job posts."
          : "Keep your details current so employers can reach you."}
      </p>

      <div className="mt-6 p-4 rounded-2xl bg-white border border-ink/10">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Profile completion</span>
          <span className={completion === 100 ? "text-success font-semibold" : "text-amber-dark font-semibold"}>
            {completion}%
          </span>
        </div>
        <div className="w-full h-2 bg-ink/5 rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              completion === 100 ? "bg-success" : "bg-amber"
            }`}
            style={{ width: `${completion}%` }}
          />
        </div>
        {completion < 100 && (
          <p className="text-xs text-muted mt-2">
            Complete profiles get more attention from {user.role === "employer" ? "candidates" : "employers"}.
          </p>
        )}
      </div>

      {message && <div className="mt-6 px-4 py-3 rounded-xl bg-success/10 text-success text-sm">{message}</div>}
      {error && <div className="mt-6 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Full name</label>
          <input
            value={form.name}
            onChange={update("name")}
            className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={update("email")}
            className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
          />
          <p className="text-xs text-muted mt-1">Used to log in — make sure you still have access to it.</p>
        </div>

        <div>
          <label className="text-sm font-medium">Phone number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={update("phone")}
            placeholder="e.g. +91 98765 43210"
            className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Location</label>
          <input
            value={form.location}
            onChange={update("location")}
            placeholder="e.g. House/street, city, state, country"
            className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
          />
        </div>

        {user.role === "jobseeker" && (
          <>
            <div>
              <label className="text-sm font-medium">Headline</label>
              <input
                value={form.headline}
                onChange={update("headline")}
                placeholder="e.g. Frontend developer, 3 years"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Years of experience</label>
              <input
                type="number"
                min="0"
                value={form.experienceYears}
                onChange={update("experienceYears")}
                className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Skills (comma separated)</label>
              <input
                value={form.skills}
                onChange={update("skills")}
                placeholder="React, Node.js, MongoDB"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
              />
            </div>

            <div className="pt-4 mt-2 border-t border-ink/10">
              <h2 className="font-display text-lg">Job preferences</h2>
              <p className="text-xs text-muted mt-1">Helps us surface the right roles for you.</p>
            </div>

            <div>
              <label className="text-sm font-medium">Role you're looking for</label>
              <input
                value={form.desiredRole}
                onChange={update("desiredRole")}
                placeholder="e.g. Frontend Developer, Product Manager"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Preferred locations</label>
              <TagAutocompleteInput
                values={form.preferredLocations}
                onChange={(vals) => setForm({ ...form, preferredLocations: vals })}
                fetchOptions={fetchLocationSuggestions}
                placeholder="e.g. Noida, Bengaluru, Pune..."
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Job type</label>
              <div className="flex flex-wrap gap-2">
                {["full-time", "part-time", "contract", "internship"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleListValue("preferredJobTypes", type)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors focus-ring ${
                      form.preferredJobTypes.includes(type)
                        ? "bg-ink text-paper border-ink"
                        : "border-ink/10 hover:border-amber"
                    }`}
                  >
                    {type.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Work mode</label>
              <div className="flex flex-wrap gap-2">
                {["onsite", "remote", "hybrid"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => toggleListValue("preferredWorkModes", mode)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors focus-ring capitalize ${
                      form.preferredWorkModes.includes(mode)
                        ? "bg-ink text-paper border-ink"
                        : "border-ink/10 hover:border-amber"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {user.role === "employer" && (
          <>
            <div>
              <label className="text-sm font-medium">Company name</label>
              <input
                value={form.companyName}
                onChange={update("companyName")}
                className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Company website</label>
              <input
                value={form.companyWebsite}
                onChange={update("companyWebsite")}
                placeholder="https://example.com"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Company description</label>
              <textarea
                rows={4}
                value={form.companyDescription}
                onChange={update("companyDescription")}
                className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-ink text-paper font-medium hover:bg-amber-dark transition-colors focus-ring disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      {user.role === "jobseeker" && (
        <div className="mt-10 p-6 rounded-2xl bg-white border border-ink/10">
          <h2 className="font-display text-xl">Resume on file</h2>
          <p className="text-sm text-muted mt-1">
            Used automatically when you apply and don't upload a fresh one.
          </p>

          {user.resumeUrl && (
            <a
              href={`${SERVER_ORIGIN}${user.resumeUrl}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-3 text-sm text-slateblue hover:underline"
            >
              View current resume
            </a>
          )}

          <div className="mt-4">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="text-sm file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-ink file:text-paper file:text-sm file:font-medium file:cursor-pointer hover:file:bg-amber-dark file:transition-colors"
            />
            {fileError && <p className="text-red-600 text-xs mt-1">{fileError}</p>}
            {resumeFile && (
              <button
                onClick={handleResumeUpload}
                disabled={uploadingResume}
                className="block mt-3 px-4 py-2 rounded-lg bg-amber text-ink text-sm font-medium hover:bg-amber-dark transition-colors focus-ring disabled:opacity-50"
              >
                {uploadingResume ? "Uploading..." : `Upload ${resumeFile.name}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
