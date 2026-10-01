import api from "./axios.js";
import { INDIAN_LOCATIONS } from "../data/locations.js";

export const fetchJobSuggestions = async (query) => {
  try {
    const res = await api.get("/jobs/suggestions", { params: { q: query } });
    const { titles = [], skills = [], companies = [] } = res.data.data;
    const companyNames = companies.map((c) => c.name);
    // Merge and dedupe — titles and company names first (usually more directly useful), then skills
    return [...new Set([...titles, ...companyNames, ...skills])].slice(0, 8);
  } catch {
    return [];
  }
};

export const fetchLocationSuggestions = async (query) => {
  const staticMatches = INDIAN_LOCATIONS.filter((loc) =>
    loc.toLowerCase().includes(query.toLowerCase())
  );

  try {
    const res = await api.get("/jobs/suggestions", { params: { q: query } });
    const { locations = [] } = res.data.data;
    // Real job locations first (these are actually hiring right now), then curated city list
    return [...new Set([...locations, ...staticMatches])].slice(0, 8);
  } catch {
    return staticMatches.slice(0, 8);
  }
};
