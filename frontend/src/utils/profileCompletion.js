export const COMPLETION_THRESHOLD = 80;

const JOBSEEKER_FIELDS = [
  "name",
  "phone",
  "profilePhotoUrl",
  "headline",
  "skills",
  "resumeUrl",
  "experienceStatus",
  "location",
  "desiredRole",
  "preferredLocations",
  "highestEducation",
];

const EMPLOYER_FIELDS = [
  "name",
  "phone",
  "profilePhotoUrl",
  "companyName",
  "companyWebsite",
  "companyDescription",
  "companyLogoUrl",
];

export const FIELD_LABELS = {
  name: "Full name",
  phone: "Phone number",
  profilePhotoUrl: "Profile photo",
  headline: "Headline",
  skills: "Skills",
  resumeUrl: "Resume",
  experienceStatus: "Experience",
  location: "Location",
  desiredRole: "Role you're looking for",
  preferredLocations: "Preferred locations",
  highestEducation: "Highest qualification",
  companyName: "Company name",
  companyWebsite: "Company website",
  companyDescription: "Company description",
  companyLogoUrl: "Company logo",
};

const isFilled = (val) => {
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "number") return val > 0;
  if (typeof val === "string") return val.trim().length > 0;
  return !!val;
};

const isFieldFilled = (user, key) => {
  // Fresher bhi "bhara hua" hai. Purane users ka experienceYears bhara ho to wo bhi chalega.
  if (key === "experienceStatus") {
    return (
      !!user.experienceStatus || (user.experienceYears || 0) > 0 || (user.experienceMonths || 0) > 0
    );
  }
  return isFilled(user[key]);
};

const fieldsFor = (user) => (user?.role === "employer" ? EMPLOYER_FIELDS : JOBSEEKER_FIELDS);

export const getMissingFields = (user) => {
  if (!user) return [];
  return fieldsFor(user).filter((f) => !isFieldFilled(user, f));
};

export const calculateCompletion = (user) => {
  if (!user) return 0;
  const fields = fieldsFor(user);
  const filled = fields.length - getMissingFields(user).length;
  return Math.round((filled / fields.length) * 100);
};