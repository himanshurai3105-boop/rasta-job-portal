import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api, { fileUrl } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import AutocompleteInput from "../components/AutocompleteInput.jsx";
import TagAutocompleteInput from "../components/TagAutocompleteInput.jsx";
import {
  fetchJobSuggestions,
  fetchLocationSuggestions,
  fetchSkillSuggestions,
  fetchInstitutionSuggestions,
} from "../api/suggestions.js";
import { INDUSTRIES } from "../data/industries.js";
import {
  EDUCATION_LEVELS,
  LEVEL_ORDER,
  DEGREES,
  BOARDS,
  STREAMS,
  OTHER_INSTITUTION_LABEL,
} from "../data/education.js";
import {
  COMPLETION_THRESHOLD,
  FIELD_LABELS,
  calculateCompletion,
  getMissingFields,
} from "../utils/profileCompletion.js";

const str = (v) => (v === undefined || v === null ? "" : String(v));
const num = (v) => (v !== "" && v !== undefined && v !== null ? Number(v) : undefined);

const loadSchool = (e) => ({
  percentage: str(e?.percentage),
  schoolName: str(e?.schoolName),
  board: str(e?.board),
  yearOfPassing: str(e?.yearOfPassing),
});

const loadHigher = (e) => ({
  degree: str(e?.degree),
  stream: str(e?.stream),
  percentage: str(e?.percentage),
  yearOfPassing: str(e?.yearOfPassing),
  institution: str(e?.institution),
  isOtherInstitution: !!e?.isOtherInstitution,
  institutionCode: str(e?.institutionCode),
});

const deriveExperience = (user) => {
  const months =
    user.experienceMonths > 0 ? user.experienceMonths : Math.round((user.experienceYears || 0) * 12);
  const status = user.experienceStatus || (months > 0 ? "experienced" : "");
  let unit = "months";
  let value = months > 0 ? String(months) : "";
  if (months >= 12 && months % 12 === 0) {
    unit = "years";
    value = String(months / 12);
  }
  return { experienceStatus: status, expValue: value, expUnit: unit };
};

const SMALL_INPUT = "w-full px-3 py-2 rounded-lg border border-ink/10 focus-ring text-sm";

const Profile = () => {
  const { user, setUser } = useAuth();
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [fileError, setFileError] = useState("");

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");

  // Pincode lookup
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinPlaces, setPinPlaces] = useState([]);

  useEffect(() => {
    if (user) {
      const exp = deriveExperience(user);
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        headline: user.headline || "",
        skills: user.skills || [],
        experienceStatus: exp.experienceStatus,
        expValue: exp.expValue,
        expUnit: exp.expUnit,
        location: user.location || "",
        houseNo: user.address?.houseNo || "",
        village: user.address?.village || "",
        block: user.address?.block || "",
        district: user.address?.district || "",
        state: user.address?.state || "",
        pincode: user.address?.pincode || "",
        desiredRole: user.desiredRole || "",
        preferredLocations: user.preferredLocations || [],
        preferredJobTypes: user.preferredJobTypes || [],
        preferredWorkModes: user.preferredWorkModes || [],
        preferredIndustries: user.preferredIndustries || [],
        highestEducation: user.highestEducation || "",
        edu: {
          tenth: loadSchool(user.education?.tenth),
          twelfth: loadSchool(user.education?.twelfth),
          graduation: loadHigher(user.education?.graduation),
          masters: loadHigher(user.education?.masters),
          phd: loadHigher(user.education?.phd),
        },
        companyName: user.companyName || "",
        companyWebsite: user.companyWebsite || "",
        companyDescription: user.companyDescription || "",
      });
    }
  }, [user]);

  // Login se incomplete profile ke saath aaye ho to pehle blank field tak scroll karo
  useEffect(() => {
    if (!form || !routerLocation.state?.incomplete) return;
    const first = getMissingFields(user)[0];
    if (!first) return;
    const el = document.getElementById(`field-${first}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form === null]);

  const completion = calculateCompletion(user);
  const missingFields = user?.role === "jobseeker" ? getMissingFields(user) : [];
  const isMissing = (key) => missingFields.includes(key);
  const inputBorder = (key) => (isMissing(key) ? "border-amber ring-2 ring-amber/30" : "border-ink/10");
  const hint = (key) =>
    isMissing(key) ? <p className="text-xs text-amber-dark mt-1 font-medium">Fill this detail</p> : null;

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const setEdu = (level, patch) =>
    setForm((prev) => ({
      ...prev,
      edu: { ...prev.edu, [level]: { ...prev.edu[level], ...patch } },
    }));

  const toggleListValue = (field, value) => {
    setForm((prev) => {
      const current = prev[field] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  // Pincode se gaon/block/district/state apne aap bharo
  const lookupPincode = async (pin) => {
    setPinLoading(true);
    setPinError("");
    try {
      const res = await api.get(`/auth/pincode/${pin}`);
      const d = res.data.data;
      const first = d.places?.[0];
      setPinPlaces(d.places || []);
      setForm((prev) =>
        prev.pincode !== pin
          ? prev // user ne beech mein pincode badal diya, purana result ignore
          : {
              ...prev,
              state: d.state || "",
              district: d.district || "",
              village: first?.name || "",
              block: first?.block || "",
            }
      );
    } catch (err) {
      setPinPlaces([]);
      setPinError(
        err.response?.data?.message || "Could not look up this pincode. You can type the details yourself."
      );
    } finally {
      setPinLoading(false);
    }
  };

  const handlePincodeChange = (e) => {
    const pin = e.target.value.replace(/\D/g, "").slice(0, 6);
    setField("pincode", pin);
    setPinError("");
    if (pin.length === 6) lookupPincode(pin);
    else setPinPlaces([]);
  };

  const levelIndex = form ? LEVEL_ORDER.indexOf(form.highestEducation) : -1;
  const showLevel = (level) => levelIndex >= LEVEL_ORDER.indexOf(level) && levelIndex >= 0;

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
        if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
          setError("Pincode must be 6 digits.");
          setSaving(false);
          return;
        }
        payload.address = {
          houseNo: form.houseNo,
          village: form.village,
          block: form.block,
          district: form.district,
          state: form.state,
          pincode: form.pincode,
        };

        payload.headline = form.headline;
        payload.skills = form.skills;
        payload.desiredRole = form.desiredRole;
        payload.preferredLocations = form.preferredLocations;
        payload.preferredJobTypes = form.preferredJobTypes;
        payload.preferredWorkModes = form.preferredWorkModes;
        payload.preferredIndustries = form.preferredIndustries;

        // Experience
        if (form.experienceStatus === "fresher") {
          payload.experienceStatus = "fresher";
          payload.experienceMonths = 0;
          payload.experienceYears = 0;
        } else if (form.experienceStatus === "experienced") {
          const val = Number(form.expValue);
          if (!val || val <= 0) {
            setError("Please enter your experience (for example 8 months or 2 years).");
            setSaving(false);
            return;
          }
          const months = form.expUnit === "years" ? Math.round(val * 12) : Math.round(val);
          payload.experienceStatus = "experienced";
          payload.experienceMonths = months;
          payload.experienceYears = Math.round((months / 12) * 10) / 10;
        }

        // Education: sirf wahi levels bhejo jo highest qualification ke hisaab se dikh rahe hain
        payload.highestEducation = form.highestEducation;
        const education = {};
        ["tenth", "twelfth"].forEach((level) => {
          if (showLevel(level)) {
            const s = form.edu[level];
            education[level] = {
              percentage: num(s.percentage),
              schoolName: s.schoolName,
              board: s.board,
              yearOfPassing: num(s.yearOfPassing),
            };
          }
        });
        ["graduation", "masters", "phd"].forEach((level) => {
          if (showLevel(level)) {
            const h = form.edu[level];
            education[level] = {
              degree: h.degree,
              stream: h.stream,
              percentage: num(h.percentage),
              yearOfPassing: num(h.yearOfPassing),
              institution: h.institution,
              isOtherInstitution: h.isOtherInstitution,
              institutionCode: h.isOtherInstitution ? h.institutionCode : "",
            };
          }
        });
        payload.education = education;
      } else if (user.role === "employer") {
        payload.companyName = form.companyName;
        payload.companyWebsite = form.companyWebsite;
        payload.companyDescription = form.companyDescription;
      }

      const res = await api.put("/auth/me", payload);
      const merged = { ...user, ...res.data.data };
      setUser(merged);

      // Incomplete profile ke baad aaye the aur ab 80%+ ho gaya -> seedha jobs page
      if (
        user.role === "jobseeker" &&
        routerLocation.state?.incomplete &&
        calculateCompletion(merged) >= COMPLETION_THRESHOLD
      ) {
        navigate("/jobs");
        return;
      }
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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    setPhotoError("");
    if (!file) return;
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExt.includes(ext)) {
      setPhotoError("Only JPG, PNG, or WEBP images are allowed");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setPhotoError("Image must be under 3MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setUploadingPhoto(true);
    setPhotoError("");
    try {
      const formData = new FormData();
      formData.append("photo", photoFile);
      const res = await api.post("/auth/me/photo", formData);
      setUser((prev) => ({ ...prev, profilePhotoUrl: res.data.data.profilePhotoUrl }));
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) {
      setPhotoError(err.response?.data?.message || "Could not upload photo");
    } finally {
      setUploadingPhoto(false);
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

  const currentPhotoUrl = photoPreview || (user.profilePhotoUrl ? fileUrl(user.profilePhotoUrl) : null);

  // 10th / 12th ka section
  const renderSchool = (level, title) => {
    const s = form.edu[level];
    return (
      <div className="p-4 rounded-xl bg-ink/5" key={level}>
        <p className="text-sm font-medium mb-2">{title}</p>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="Percentage"
            value={s.percentage}
            onChange={(e) => setEdu(level, { percentage: e.target.value })}
            className={SMALL_INPUT}
          />
          <input
            type="number"
            placeholder="Year of passing"
            value={s.yearOfPassing}
            onChange={(e) => setEdu(level, { yearOfPassing: e.target.value })}
            className={SMALL_INPUT}
          />
          <div className="col-span-2">
            <input
              placeholder="School name"
              value={s.schoolName}
              onChange={(e) => setEdu(level, { schoolName: e.target.value })}
              className={SMALL_INPUT}
            />
          </div>
          <div className="col-span-2">
            <AutocompleteInput
              value={s.board}
              onChange={(val) => setEdu(level, { board: val })}
              options={BOARDS}
              minChars={1}
              placeholder="Board (type or choose, e.g. CBSE)"
              className={SMALL_INPUT}
            />
          </div>
        </div>
      </div>
    );
  };

  // Graduation / Masters / PhD ka section
  const renderHigher = (level, title) => {
    const h = form.edu[level];
    return (
      <div className="p-4 rounded-xl bg-ink/5" key={level}>
        <p className="text-sm font-medium mb-2">{title}</p>
        <div className="grid grid-cols-2 gap-3">
          <AutocompleteInput
            value={h.degree}
            onChange={(val) => setEdu(level, { degree: val })}
            options={DEGREES[level]}
            minChars={1}
            placeholder="Degree (e.g. B.Tech)"
            className={SMALL_INPUT}
          />
          <AutocompleteInput
            value={h.stream}
            onChange={(val) => setEdu(level, { stream: val })}
            options={STREAMS}
            minChars={1}
            placeholder="Stream / subject"
            className={SMALL_INPUT}
          />
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="Percentage"
            value={h.percentage}
            onChange={(e) => setEdu(level, { percentage: e.target.value })}
            className={SMALL_INPUT}
          />
          <input
            type="number"
            placeholder="Year of passing"
            value={h.yearOfPassing}
            onChange={(e) => setEdu(level, { yearOfPassing: e.target.value })}
            className={SMALL_INPUT}
          />

          <div className="col-span-2">
            {h.isOtherInstitution ? (
              <div className="space-y-2">
                <input
                  placeholder="College / University name"
                  value={h.institution}
                  onChange={(e) => setEdu(level, { institution: e.target.value })}
                  className={SMALL_INPUT}
                />
                <input
                  placeholder="College / University code"
                  value={h.institutionCode}
                  onChange={(e) => setEdu(level, { institutionCode: e.target.value })}
                  className={SMALL_INPUT}
                />
                <button
                  type="button"
                  onClick={() => setEdu(level, { isOtherInstitution: false, institution: "", institutionCode: "" })}
                  className="text-xs text-amber-dark hover:underline focus-ring rounded"
                >
                  Choose from the list instead
                </button>
              </div>
            ) : (
              <AutocompleteInput
                value={h.institution}
                onChange={(val) => setEdu(level, { institution: val })}
                onSelect={(val) => {
                  if (val === OTHER_INSTITUTION_LABEL) {
                    setEdu(level, { isOtherInstitution: true, institution: "", institutionCode: "" });
                  }
                }}
                fetchOptions={fetchInstitutionSuggestions}
                maxResults={10}
                placeholder="College / University (type to search)"
                className={SMALL_INPUT}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl">Your profile</h1>
      <p className="text-muted mt-2">
        {user.role === "employer"
          ? "Keep your company details current — candidates see this on your job posts."
          : "Keep your details current so employers can reach you."}
      </p>

      {/* Complete your profile banner */}
      {user.role === "jobseeker" && completion < COMPLETION_THRESHOLD && (
        <div className="mt-6 p-4 rounded-2xl bg-amber/10 border border-amber/40">
          <p className="font-semibold text-sm">Complete your profile</p>
          <p className="text-xs text-muted mt-1">
            Your profile is {completion}% complete. At least {COMPLETION_THRESHOLD}% is needed to get job matches
            for your city and skills. Please fill these details:
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {missingFields.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(`field-${key}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                  className="text-xs px-2.5 py-1 rounded-full bg-white border border-amber/50 text-amber-dark hover:bg-amber/20 transition-colors focus-ring"
                >
                  {FIELD_LABELS[key]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Profile photo */}
      <div
        id="field-profilePhotoUrl"
        className={`mt-6 p-4 rounded-2xl bg-white border flex items-center gap-4 ${
          isMissing("profilePhotoUrl") ? "border-amber ring-2 ring-amber/30" : "border-ink/10"
        }`}
      >
        <div className="w-16 h-16 rounded-full bg-ink/5 overflow-hidden shrink-0 flex items-center justify-center">
          {currentPhotoUrl ? (
            <img src={currentPhotoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-display text-ink/30">{user.name?.[0]?.toUpperCase()}</span>
          )}
        </div>
        <div>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handlePhotoChange}
            className="text-xs file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-ink file:text-paper file:text-xs file:font-medium file:cursor-pointer hover:file:bg-amber-dark file:transition-colors"
          />
          {hint("profilePhotoUrl")}
          {photoError && <p className="text-red-600 text-xs mt-1">{photoError}</p>}
          {photoFile && (
            <button
              onClick={handlePhotoUpload}
              disabled={uploadingPhoto}
              className="block mt-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber text-ink hover:bg-amber-dark transition-colors focus-ring disabled:opacity-50"
            >
              {uploadingPhoto ? "Uploading..." : "Save photo"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 p-4 rounded-2xl bg-white border border-ink/10">
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
        <div id="field-name">
          <label className="text-sm font-medium">Full name</label>
          <input
            value={form.name}
            onChange={update("name")}
            className={`w-full mt-1 px-4 py-3 rounded-xl border focus-ring ${inputBorder("name")}`}
          />
          {hint("name")}
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

        <div id="field-phone">
          <label className="text-sm font-medium">Phone number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={update("phone")}
            placeholder="e.g. +91 98765 43210"
            className={`w-full mt-1 px-4 py-3 rounded-xl border focus-ring ${inputBorder("phone")}`}
          />
          {hint("phone")}
        </div>

        {/* Location + address */}
        <div id="field-location">
          <label className="text-sm font-medium">Location (area, city, state, country)</label>
          <div className="mt-1">
            <AutocompleteInput
              value={form.location}
              onChange={(val) => setField("location", val)}
              fetchOptions={fetchLocationSuggestions}
              maxResults={12}
              placeholder="e.g. Sector 15, Noida, Uttar Pradesh, India"
              className={`w-full px-4 py-3 rounded-xl border focus-ring ${inputBorder("location")}`}
            />
          </div>
          <p className="text-xs text-muted mt-1">Pick a suggestion, or type your own. Jobs are matched using this.</p>
          {hint("location")}
        </div>

        {user.role === "jobseeker" && (
          <div className="p-4 rounded-xl bg-ink/5">
            <p className="text-sm font-medium">Full address</p>
            <p className="text-xs text-muted mt-1">
              Enter your pincode and the village, block, district and state fill in automatically. You can edit them.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="col-span-2">
                <label className="text-xs font-medium">Pincode</label>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pincode}
                  onChange={handlePincodeChange}
                  placeholder="6-digit pincode"
                  className="w-full mt-1 px-3 py-2.5 rounded-lg border border-ink/10 focus-ring text-sm"
                />
                {pinLoading && <p className="text-xs text-muted mt-1">Looking up pincode…</p>}
                {pinError && <p className="text-xs text-red-600 mt-1">{pinError}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium">House number / street</label>
                <input
                  value={form.houseNo}
                  onChange={update("houseNo")}
                  placeholder="e.g. H-45, Gali no. 3"
                  className="w-full mt-1 px-3 py-2.5 rounded-lg border border-ink/10 focus-ring text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Village / area / post office</label>
                <input
                  value={form.village}
                  onChange={update("village")}
                  placeholder="Village or locality"
                  className="w-full mt-1 px-3 py-2.5 rounded-lg border border-ink/10 focus-ring text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Block / taluka</label>
                <input
                  value={form.block}
                  onChange={update("block")}
                  placeholder="Block or taluka"
                  className="w-full mt-1 px-3 py-2.5 rounded-lg border border-ink/10 focus-ring text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium">District</label>
                <input
                  value={form.district}
                  onChange={update("district")}
                  placeholder="District"
                  className="w-full mt-1 px-3 py-2.5 rounded-lg border border-ink/10 focus-ring text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium">State</label>
                <input
                  value={form.state}
                  onChange={update("state")}
                  placeholder="State"
                  className="w-full mt-1 px-3 py-2.5 rounded-lg border border-ink/10 focus-ring text-sm"
                />
              </div>

              {pinPlaces.length > 1 && (
                <div className="col-span-2">
                  <p className="text-xs text-muted">This pincode has more than one area. Tap yours:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pinPlaces.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, village: p.name, block: p.block || prev.block }))
                        }
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus-ring ${
                          form.village === p.name
                            ? "bg-ink text-paper border-ink"
                            : "bg-white border-ink/10 hover:border-amber"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {user.role === "jobseeker" && (
          <>
            <div id="field-headline">
              <label className="text-sm font-medium">Headline</label>
              <input
                value={form.headline}
                onChange={update("headline")}
                placeholder="e.g. Frontend developer, 3 years"
                className={`w-full mt-1 px-4 py-3 rounded-xl border focus-ring ${inputBorder("headline")}`}
              />
              {hint("headline")}
            </div>

            {/* Experience */}
            <div id="field-experienceStatus">
              <label className="text-sm font-medium block mb-2">Experience</label>
              <div
                className={`p-3 rounded-xl border ${
                  isMissing("experienceStatus") ? "border-amber ring-2 ring-amber/30" : "border-ink/10"
                }`}
              >
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "fresher", label: "Fresher" },
                    { value: "experienced", label: "Experienced" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setField("experienceStatus", opt.value)}
                      className={`px-4 py-1.5 rounded-full text-sm border transition-colors focus-ring ${
                        form.experienceStatus === opt.value
                          ? "bg-ink text-paper border-ink"
                          : "border-ink/10 hover:border-amber"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {form.experienceStatus === "experienced" && (
                  <div className="flex gap-3 mt-3">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.expValue}
                      onChange={update("expValue")}
                      placeholder="e.g. 8"
                      className="w-32 px-4 py-2.5 rounded-xl border border-ink/10 focus-ring"
                    />
                    <select
                      value={form.expUnit}
                      onChange={update("expUnit")}
                      className="px-4 py-2.5 rounded-xl border border-ink/10 focus-ring bg-white"
                    >
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                )}
              </div>
              {hint("experienceStatus")}
            </div>

            {/* Skills */}
            <div id="field-skills">
              <label className="text-sm font-medium block mb-2">Skills</label>
              <div className={`rounded-xl ${isMissing("skills") ? "ring-2 ring-amber/30 border border-amber p-2" : ""}`}>
                <TagAutocompleteInput
                  values={form.skills}
                  onChange={(vals) => setField("skills", vals)}
                  fetchOptions={fetchSkillSuggestions}
                  maxResults={10}
                  placeholder="e.g. React, Sales, Excel..."
                />
              </div>
              {hint("skills")}
            </div>

            {/* Education */}
            <div className="pt-4 mt-2 border-t border-ink/10">
              <h2 className="font-display text-lg">Education</h2>
              <p className="text-xs text-muted mt-1">
                Choose your highest qualification first. Related sections will open below.
              </p>
            </div>

            <div id="field-highestEducation">
              <label className="text-sm font-medium">Highest qualification</label>
              <select
                value={form.highestEducation}
                onChange={update("highestEducation")}
                className={`w-full mt-1 px-4 py-3 rounded-xl border focus-ring bg-white ${inputBorder("highestEducation")}`}
              >
                <option value="">Select your highest qualification</option>
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              {hint("highestEducation")}
            </div>

            {showLevel("tenth") && renderSchool("tenth", "10th standard")}
            {showLevel("twelfth") && renderSchool("twelfth", "12th standard")}
            {showLevel("graduation") && renderHigher("graduation", "Graduation")}
            {showLevel("masters") && renderHigher("masters", "Masters (Post graduation)")}
            {showLevel("phd") && renderHigher("phd", "PhD")}

            {/* Job preferences */}
            <div className="pt-4 mt-2 border-t border-ink/10">
              <h2 className="font-display text-lg">Job preferences</h2>
              <p className="text-xs text-muted mt-1">Helps us surface the right roles for you.</p>
            </div>

            <div id="field-desiredRole">
              <label className="text-sm font-medium">Role you're looking for</label>
              <div className="mt-1">
                <AutocompleteInput
                  value={form.desiredRole}
                  onChange={(val) => setField("desiredRole", val)}
                  fetchOptions={fetchJobSuggestions}
                  placeholder="e.g. Frontend Developer, Sales Executive"
                  className={`w-full px-4 py-3 rounded-xl border focus-ring ${inputBorder("desiredRole")}`}
                />
              </div>
              {hint("desiredRole")}
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Preferred industries</label>
              <TagAutocompleteInput
                values={form.preferredIndustries}
                onChange={(vals) => setField("preferredIndustries", vals)}
                options={INDUSTRIES}
                minChars={1}
                placeholder="e.g. IT & Software, Sales..."
              />
            </div>

            <div id="field-preferredLocations">
              <label className="text-sm font-medium block mb-2">Preferred locations</label>
              <div
                className={`rounded-xl ${
                  isMissing("preferredLocations") ? "ring-2 ring-amber/30 border border-amber p-2" : ""
                }`}
              >
                <TagAutocompleteInput
                  values={form.preferredLocations}
                  onChange={(vals) => setField("preferredLocations", vals)}
                  fetchOptions={fetchLocationSuggestions}
                  maxResults={12}
                  placeholder="e.g. Noida, Sector 62 Noida, Pune..."
                />
              </div>
              {hint("preferredLocations")}
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
        <div
          id="field-resumeUrl"
          className={`mt-10 p-6 rounded-2xl bg-white border ${
            isMissing("resumeUrl") ? "border-amber ring-2 ring-amber/30" : "border-ink/10"
          }`}
        >
          <h2 className="font-display text-xl">Resume on file</h2>
          <p className="text-sm text-muted mt-1">
            Used automatically when you apply and don't upload a fresh one.
          </p>
          {hint("resumeUrl")}

          {user.resumeUrl && (
            <a
              href={fileUrl(user.resumeUrl)}
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