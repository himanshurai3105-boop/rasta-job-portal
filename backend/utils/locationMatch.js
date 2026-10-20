// Regex mein user ka text daalne se pehle special characters (+, ., # waghera) escape karta hai
export const escapeRegex = (text = "") => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Delhi, Chandigarh, Puducherry ko jaan-boojhkar yahan nahi rakha, kyunki ye state bhi hain aur shehar bhi
const STATES = [
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat",
  "haryana", "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh",
  "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland", "odisha", "punjab", "rajasthan",
  "sikkim", "tamil nadu", "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal",
  "andaman and nicobar islands", "dadra and nagar haveli and daman and diu",
  "jammu and kashmir", "ladakh", "lakshadweep",
];

// "Sector 15, Noida, Uttar Pradesh, India" -> { cities: ["noida"], areas: ["sector 15"], states: ["uttar pradesh"] }
export const parseLocation = (text = "") => {
  const parts = String(text)
    .toLowerCase()
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const cities = [];
  const areas = [];
  const states = [];

  parts.forEach((p) => {
    if (p === "india") return;
    if (/^\d{6}$/.test(p)) return; // pincode
    if (STATES.includes(p)) states.push(p);
    else if (/^sector\s*\d+/.test(p)) areas.push(p);
    else cities.push(p);
  });

  return { cities, areas, states };
};

// Job ki location mein dhoondne layak words: pehle shehar, nahi to area, nahi to state
export const locationTokens = (text = "") => {
  const { cities, areas, states } = parseLocation(text);
  let tokens = cities.length ? cities : areas.length ? areas : states;
  tokens = tokens.filter((t) => t.length >= 2);

  if (tokens.length === 0) {
    const raw = String(text).trim().toLowerCase();
    if (raw.length >= 2 && raw !== "india") tokens = [raw];
  }
  return [...new Set(tokens)];
};