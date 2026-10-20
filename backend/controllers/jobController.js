import asyncHandler from "express-async-handler";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { escapeRegex, locationTokens } from "../utils/locationMatch.js";

const EXPERIENCE_RANGES = {
  entry: [0, 2],
  mid: [2, 5],
  senior: [5, 9],
  lead: [8, 50],
};

const RECOMMENDED_LIMIT = 25;
const NEARBY_RADIUS_KM = 100; // itni doori tak ki jobs pool mein aayengi

const hasCoords = (c) => c && typeof c.lat === "number" && typeof c.lng === "number";

// Do coordinates ke beech seedhi-line doori (km)
const haversineKm = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const kmLabel = (km) => (km < 1 ? "Less than 1 km from you" : `About ${Math.round(km)} km from you`);

// @desc    Get all jobs (with search, filters, pagination)
// @route   GET /api/jobs
// @access  Public
export const getJobs = asyncHandler(async (req, res) => {
  const {
    keyword,
    location,
    jobType,
    workMode,
    experienceLevel,
    category,
    salaryMin,
    salaryMax,
    skills,
    page = 1,
    limit = 10,
  } = req.query;

  const query = { status: "active" };
  const andConditions = [];

  if (keyword) {
    const kwRegex = new RegExp(escapeRegex(keyword), "i");
    andConditions.push({
      $or: [{ title: kwRegex }, { companyName: kwRegex }, { skills: kwRegex }, { description: kwRegex }],
    });
  }

  if (location) {
    // "Sector 15, Noida, Uttar Pradesh, India" -> sirf "noida" dhoondta hai
    const tokens = locationTokens(location);
    if (tokens.length > 0) {
      andConditions.push({
        $or: tokens.map((t) => ({ location: new RegExp(escapeRegex(t), "i") })),
      });
    }
  }

  if (andConditions.length > 0) query.$and = andConditions;

  if (jobType) query.jobType = jobType;
  if (workMode) query.workMode = workMode;
  if (experienceLevel) query.experienceLevel = experienceLevel;
  if (category) query.category = category;

  // A job matches the salary filter if its range overlaps the requested range
  if (salaryMin) query.salaryMax = { $gte: Number(salaryMin) };
  if (salaryMax) query.salaryMin = { $lte: Number(salaryMax) };

  if (skills) {
    const skillList = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (skillList.length > 0) {
      query.skills = { $in: skillList.map((s) => new RegExp(escapeRegex(s), "i")) };
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .sort({ isUrgent: -1, isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("employer", "companyName companyLogoUrl"),
    Job.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: jobs,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// @desc    Get single job by slug
// @route   GET /api/jobs/:slug
// @access  Public
export const getJobBySlug = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ slug: req.params.slug }).populate(
    "employer",
    "companyName companyLogoUrl companyWebsite companyDescription"
  );

  if (!job) {
    res.status(404);
    throw new Error("Job not found");
  }

  job.viewsCount += 1;
  await job.save();

  res.json({ success: true, data: job });
});

// @desc    Create job
// @route   POST /api/jobs
// @access  Private/Employer
export const createJob = asyncHandler(async (req, res) => {
  const job = await Job.create({
    ...req.body,
    employer: req.user._id,
    companyName: req.body.companyName || req.user.companyName,
    companyLogoUrl: req.user.companyLogoUrl,
  });

  res.status(201).json({ success: true, data: job });
});

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private/Employer (owner only)
export const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error("Job not found");
  }
  if (job.employer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to edit this job");
  }

  Object.assign(job, req.body);
  await job.save();

  res.json({ success: true, data: job });
});

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private/Employer (owner only) or Admin
export const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error("Job not found");
  }
  if (
    job.employer.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Not authorized to delete this job");
  }

  await job.deleteOne();
  res.json({ success: true, message: "Job removed" });
});

// @desc    Get jobs posted by logged-in employer
// @route   GET /api/jobs/employer/mine
// @access  Private/Employer
export const getMyJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ employer: req.user._id }).sort({
    createdAt: -1,
  });
  res.json({ success: true, data: jobs });
});

// @desc    Save or unsave a job (toggle)
// @route   POST /api/jobs/:id/save
// @access  Private/Jobseeker
export const toggleSaveJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404);
    throw new Error("Job not found");
  }

  const user = await User.findById(req.user._id);
  const alreadySaved = user.savedJobs.some((id) => id.toString() === job._id.toString());

  if (alreadySaved) {
    user.savedJobs = user.savedJobs.filter((id) => id.toString() !== job._id.toString());
  } else {
    user.savedJobs.push(job._id);
  }
  await user.save();

  res.json({ success: true, data: { saved: !alreadySaved } });
});

// @desc    Get logged-in jobseeker's saved jobs
// @route   GET /api/jobs/saved/mine
// @access  Private/Jobseeker
export const getSavedJobs = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "savedJobs",
    populate: { path: "employer", select: "companyName companyLogoUrl" },
  });
  res.json({ success: true, data: user.savedJobs });
});

// @desc    Up to 25 jobs for the logged-in jobseeker: nearby (km), preferred city, matching skills, role, industry
// @route   GET /api/jobs/recommended/mine
// @access  Private/Jobseeker
export const getRecommendedJobs = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  const userSkills = (user.skills || []).map((s) => s.trim()).filter(Boolean);
  const userSkillSet = new Set(userSkills.map((s) => s.toLowerCase()));

  // "Sector 15, Noida, Uttar Pradesh, India" jaisi poori string se sirf shehar/area nikalte hain
  const preferredTokens = [
    ...new Set((user.preferredLocations || []).flatMap((l) => locationTokens(l))),
  ];
  const homeTokens = locationTokens(user.location);
  const userCoords = hasCoords(user.coordinates)
    ? { lat: user.coordinates.lat, lng: user.coordinates.lng }
    : null;

  const industries = user.preferredIndustries || [];
  const desiredRole = (user.desiredRole || "").trim().toLowerCase();

  // Candidate pool: koi bhi ek cheez match kare to job pool mein aayegi
  const orConditions = [];
  if (userSkills.length) {
    orConditions.push({ skills: { $in: userSkills.map((s) => new RegExp(escapeRegex(s), "i")) } });
  }
  if (industries.length) {
    orConditions.push({ category: { $in: industries } });
  }
  [...preferredTokens, ...homeTokens].forEach((token) => {
    orConditions.push({ location: new RegExp(escapeRegex(token), "i") });
  });
  if (desiredRole) {
    orConditions.push({ title: new RegExp(escapeRegex(desiredRole), "i") });
  }
  if (userCoords) {
    // Candidate ke aas-paas (lagbhag 100 km) ka dabba, coordinates se
    const latDelta = NEARBY_RADIUS_KM / 111;
    const lngDelta =
      NEARBY_RADIUS_KM / (111 * Math.max(Math.cos((userCoords.lat * Math.PI) / 180), 0.2));
    orConditions.push({
      "coordinates.lat": { $gte: userCoords.lat - latDelta, $lte: userCoords.lat + latDelta },
      "coordinates.lng": { $gte: userCoords.lng - lngDelta, $lte: userCoords.lng + lngDelta },
    });
  }

  if (orConditions.length === 0) {
    return res.json({
      success: true,
      data: [],
      message: "Add your location, skills or preferred cities to your profile to get recommendations.",
    });
  }

  const candidates = await Job.find({ status: "active", $or: orConditions })
    .populate("employer", "companyName companyLogoUrl")
    .limit(300);

  const experienceYears = user.experienceYears || 0;

  const scored = candidates
    .map((job) => {
      const jobLocation = (job.location || "").toLowerCase();
      const km =
        userCoords && hasCoords(job.coordinates) ? haversineKm(userCoords, job.coordinates) : null;
      const reasons = [];
      let score = 0;
      let locationMatch = "none";

      // 1. Location (max 35) — sabse zyada weight
      if (preferredTokens.some((token) => jobLocation.includes(token))) {
        score += 35;
        locationMatch = "preferred";
        reasons.push("In your preferred city");
      } else if (km !== null && km <= 25) {
        score += 30;
        locationMatch = "near";
        reasons.push(kmLabel(km));
      } else if (km !== null && km <= 50) {
        score += 22;
        locationMatch = "near";
        reasons.push(kmLabel(km));
      } else if (homeTokens.some((token) => jobLocation.includes(token))) {
        score += 25;
        locationMatch = "near";
        reasons.push("Near your location");
      } else if (job.workMode === "remote" && user.preferredWorkModes?.includes("remote")) {
        score += 20;
        locationMatch = "remote";
        reasons.push("Remote role");
      } else if (km !== null && km <= NEARBY_RADIUS_KM) {
        score += 12;
        locationMatch = "near";
        reasons.push(kmLabel(km));
      }

      // 2. Skills (max 30)
      const jobSkills = job.skills || [];
      const matchedSkills = jobSkills.filter((s) => userSkillSet.has(s.toLowerCase()));
      const missingSkills = jobSkills.filter((s) => !userSkillSet.has(s.toLowerCase())).slice(0, 4);
      if (jobSkills.length > 0) {
        score += Math.round((30 * matchedSkills.length) / jobSkills.length);
        if (matchedSkills.length > 0) {
          reasons.push(`${matchedSkills.length}/${jobSkills.length} skills match`);
        }
      }

      // 3. Desired role (max 12)
      if (desiredRole && (job.title || "").toLowerCase().includes(desiredRole)) {
        score += 12;
        reasons.push("Matches your desired role");
      }

      // 4. Industry (max 8)
      if (industries.includes(job.category)) {
        score += 8;
        reasons.push("Your preferred industry");
      }

      // 5. Experience level (max 7)
      const range = EXPERIENCE_RANGES[job.experienceLevel];
      if (range && experienceYears >= range[0] && experienceYears <= range[1]) {
        score += 7;
        reasons.push("Fits your experience level");
      }

      // 6. Job type & work mode (max 4 + 4)
      if (user.preferredJobTypes?.includes(job.jobType)) score += 4;
      if (user.preferredWorkModes?.includes(job.workMode)) score += 4;

      return {
        score,
        km,
        item: {
          ...job.toObject(),
          matchPercent: Math.min(100, score),
          matchReasons: reasons,
          missingSkills,
          locationMatch,
          distanceKm: km !== null ? Math.round(km * 10) / 10 : null,
        },
      };
    })
    .filter((s) => s.score >= 15)
    .sort((a, b) => b.score - a.score || (a.km ?? 1e9) - (b.km ?? 1e9))
    .slice(0, RECOMMENDED_LIMIT)
    .map((s) => s.item);

  res.json({ success: true, data: scored });
});

// @desc    Get a company's public profile + their active job listings
// @route   GET /api/jobs/company/:employerId
// @access  Public
export const getCompanyProfile = asyncHandler(async (req, res) => {
  const employer = await User.findOne({ _id: req.params.employerId, role: "employer" }).select(
    "companyName companyLogoUrl companyWebsite companyDescription isVerified createdAt"
  );

  if (!employer) {
    res.status(404);
    throw new Error("Company not found");
  }

  const jobs = await Job.find({ employer: employer._id, status: "active" }).sort({ createdAt: -1 });

  res.json({ success: true, data: { company: employer, jobs } });
});

// @desc    Autocomplete suggestions for job titles and skills, based on real active listings
// @route   GET /api/jobs/suggestions?q=react
// @access  Public
export const getSearchSuggestions = asyncHandler(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 2) {
    return res.json({ success: true, data: { titles: [], skills: [], locations: [], companies: [] } });
  }

  const regex = new RegExp(escapeRegex(q), "i");

  const matchingJobs = await Job.find({
    status: "active",
    $or: [{ title: regex }, { skills: regex }, { location: regex }, { companyName: regex }],
  })
    .select("title skills location companyName employer")
    .limit(50);

  const titleSet = new Set();
  const skillSet = new Set();
  const locationSet = new Set();
  const companySet = new Map(); // name -> employerId, deduped

  matchingJobs.forEach((job) => {
    if (regex.test(job.title)) titleSet.add(job.title);
    if (regex.test(job.location)) locationSet.add(job.location);
    if (regex.test(job.companyName)) companySet.set(job.companyName, job.employer?.toString());
    (job.skills || []).forEach((s) => {
      if (regex.test(s)) skillSet.add(s);
    });
  });

  res.json({
    success: true,
    data: {
      titles: [...titleSet].slice(0, 6),
      skills: [...skillSet].slice(0, 6),
      locations: [...locationSet].slice(0, 6),
      companies: [...companySet.entries()].slice(0, 6).map(([name, employerId]) => ({ name, employerId })),
    },
  });
});

// @desc    Aggregated salary insights across active listings
// @route   GET /api/jobs/salary-insights
// @access  Public
export const getSalaryInsights = asyncHandler(async (req, res) => {
  const baseMatch = { status: "active", salaryMin: { $gt: 0 }, salaryMax: { $gt: 0 } };

  const [overall, byExperience, byJobType, topLocations, topTitles] = await Promise.all([
    Job.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          avgMin: { $avg: "$salaryMin" },
          avgMax: { $avg: "$salaryMax" },
          count: { $sum: 1 },
        },
      },
    ]),
    Job.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$experienceLevel",
          avgSalary: { $avg: { $avg: ["$salaryMin", "$salaryMax"] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgSalary: 1 } },
    ]),
    Job.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$jobType",
          avgSalary: { $avg: { $avg: ["$salaryMin", "$salaryMax"] } },
          count: { $sum: 1 },
        },
      },
    ]),
    Job.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$location",
          avgSalary: { $avg: { $avg: ["$salaryMin", "$salaryMax"] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Job.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$title",
          avgSalary: { $avg: { $avg: ["$salaryMin", "$salaryMax"] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      overall: overall[0] || { avgMin: 0, avgMax: 0, count: 0 },
      byExperience: byExperience.map((r) => ({ level: r._id, avgSalary: Math.round(r.avgSalary), count: r.count })),
      byJobType: byJobType.map((r) => ({ type: r._id, avgSalary: Math.round(r.avgSalary), count: r.count })),
      topLocations: topLocations.map((r) => ({ location: r._id, avgSalary: Math.round(r.avgSalary), count: r.count })),
      topTitles: topTitles.map((r) => ({ title: r._id, avgSalary: Math.round(r.avgSalary), count: r.count })),
    },
  });
});

// @desc    Get featured/urgent jobs for homepage highlight
// @route   GET /api/jobs/featured
// @access  Public
export const getFeaturedJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find({
    status: "active",
    $or: [{ isFeatured: true }, { isUrgent: true }],
  })
    .populate("employer", "companyName companyLogoUrl")
    .sort({ isUrgent: -1, isFeatured: -1, createdAt: -1 })
    .limit(6);

  res.json({ success: true, data: jobs });
});