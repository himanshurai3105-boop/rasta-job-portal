import api from "./axios.js";
import { INDIAN_LOCATIONS } from "../data/locations.js";
import { GEO_SUGGESTIONS } from "../data/geo.js";
import { SKILLS } from "../data/skills.js";
import { JOB_TITLES } from "../data/jobTitles.js";
import { INSTITUTIONS, OTHER_INSTITUTION_LABEL } from "../data/education.js";
import { rankMatches, uniqueCI } from "../utils/textMatch.js";

// Jobs ke asli data se suggestions (titles, skills, locations, companies)
const fetchServerSuggestions = async (query) => {
  try {
    const res = await api.get("/jobs/suggestions", { params: { q: query } });
    const { titles = [], skills = [], locations = [], companies = [] } = res.data.data;
    return { titles, skills, locations, companies: companies.map((c) => c.name) };
  } catch {
    return { titles: [], skills: [], locations: [], companies: [] };
  }
};

// ---------- OpenStreetMap (live location search, India) ----------
const osmCache = new Map();

const osmLabel = (item) => {
  const a = item.address || {};
  const city = a.city || a.town || a.village || a.municipality || a.county || a.state_district;
  const area = a.suburb || a.neighbourhood || a.quarter || a.hamlet;
  const parts = [item.name, area, city, a.state, a.country].filter(Boolean);
  const seen = new Set();
  const clean = parts.filter((p) => {
    const k = p.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return clean.length ? clean.join(", ") : null;
};

const searchOpenStreetMap = async (query) => {
  const key = query.trim().toLowerCase();
  if (osmCache.has(key)) return osmCache.get(key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const params = new URLSearchParams({
      q: query,
      format: "jsonv2",
      addressdetails: "1",
      limit: "8",
      countrycodes: "in",
      "accept-language": "en",
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const labels = data.map(osmLabel).filter(Boolean);
    osmCache.set(key, labels);
    return labels;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
};

// ---------- Exports ----------

// Job search box: titles, company names aur skills
export const fetchJobSuggestions = async (query) => {
  const server = await fetchServerSuggestions(query);
  const staticMatches = rankMatches([...JOB_TITLES, ...SKILLS], query, 8);
  return uniqueCI([...server.titles, ...server.companies, ...server.skills, ...staticMatches]).slice(0, 10);
};

// Location: jobs ki locations + country/state/sectors/shehar + OpenStreetMap
export const fetchLocationSuggestions = async (query) => {
  const staticMatches = rankMatches([...INDIAN_LOCATIONS, ...GEO_SUGGESTIONS], query, 12);

  const [server, osm] = await Promise.all([
    fetchServerSuggestions(query),
    query.trim().length >= 3 ? searchOpenStreetMap(query) : Promise.resolve([]),
  ]);

  // Pehle jaha jobs hain, phir built-in list, phir map search
  return uniqueCI([...server.locations, ...staticMatches, ...osm]).slice(0, 12);
};

// Skills: jobs ke asli skills + built-in list
export const fetchSkillSuggestions = async (query) => {
  const server = await fetchServerSuggestions(query);
  const staticMatches = rankMatches(SKILLS, query, 10);
  return uniqueCI([...staticMatches, ...server.skills]).slice(0, 10);
};

// College / University: list + hamesha end mein "Other" option
export const fetchInstitutionSuggestions = async (query) => {
  const matches = rankMatches(INSTITUTIONS, query, 9);
  return [...matches, OTHER_INSTITUTION_LABEL];
};