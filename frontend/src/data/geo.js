// Country, state aur NCR ke sectors ki built-in list.
// Baaki shehar/area OpenStreetMap se live aate hain (api/suggestions.js dekho).

export const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const SECTOR_LOCATIONS = [
  ...range(1, 168).map((n) => `Sector ${n}, Noida, Uttar Pradesh, India`),
  ...range(1, 115).map((n) => `Sector ${n}, Gurugram, Haryana, India`),
];

export const GEO_SUGGESTIONS = [
  "India",
  ...INDIA_STATES.map((s) => `${s}, India`),
  ...SECTOR_LOCATIONS,
];