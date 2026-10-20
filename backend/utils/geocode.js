// Location ke naam se latitude/longitude nikalta hai (OpenStreetMap Nominatim, free).
// Nominatim ka niyam: 1 second mein 1 se zyada request nahi, isliye queue aur gap rakha hai.

const USER_AGENT = process.env.GEOCODER_USER_AGENT || "rasta-job-portal/1.0";
const MIN_GAP_MS = 1100;
const TEMP_FAIL_MS = 10 * 60 * 1000; // service band ho to 10 minute tak dobara nahi poochte

const cache = new Map(); // query -> { lat, lng } ya null (nahi mila)
const tempFailures = new Map(); // query -> time
let lastCall = 0;
let chain = Promise.resolve();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Return: {lat,lng} = mil gaya, null = is naam ki jagah nahi mili, undefined = abhi service se jawab nahi aaya
const queryNominatim = async (q) => {
  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const failedAt = tempFailures.get(key);
  if (failedAt && Date.now() - failedAt < TEMP_FAIL_MS) return undefined;

  const run = async () => {
    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const params = new URLSearchParams({
        q,
        format: "jsonv2",
        limit: "1",
        countrycodes: "in",
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
        signal: controller.signal,
      });
      if (!res.ok) return undefined;
      const data = await res.json();
      const first = Array.isArray(data) ? data[0] : null;
      if (!first) return null;
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
      return { lat, lng };
    } catch {
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  };

  const result = chain.then(run, run);
  chain = result.catch(() => {});
  const value = await result;

  if (value === undefined) tempFailures.set(key, Date.now());
  else cache.set(key, value);
  return value;
};

/**
 * "Sector 62, Noida, Uttar Pradesh" jaisi location ke coordinates.
 * Pehle poora naam, na mile to chhota karke (aage ka hissa hata ke) try karta hai.
 * Return: {lat,lng} | null (nahi mili) | undefined (service abhi kaam nahi kar rahi, baad mein dobara try karo)
 */
export const geocodeText = async (text) => {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length < 2) return null;

  const parts = clean.split(",").map((s) => s.trim()).filter(Boolean);
  const attempts = [clean];
  if (parts.length > 2) attempts.push(parts.slice(1).join(", "));
  if (parts.length > 1) attempts.push(parts.slice(-2).join(", "));

  for (const q of [...new Set(attempts)]) {
    const result = await queryNominatim(q);
    if (result === undefined) return undefined;
    if (result) return result;
  }
  return null;
};

// Candidate ke liye geocode karne layak text: pehle location, nahi to address
export const userGeoText = (user) => {
  if (user?.location && user.location.trim()) return user.location.trim();
  const a = user?.address || {};
  const parts = [a.village, a.district, a.state].filter(Boolean);
  if (parts.length) return `${parts.join(", ")}, India`;
  return a.pincode ? `${a.pincode}, India` : "";
};