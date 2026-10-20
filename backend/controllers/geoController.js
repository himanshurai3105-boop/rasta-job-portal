import asyncHandler from "express-async-handler";

// Ek hi pincode baar-baar na poochna pade, isliye 24 ghante ke liye memory mein rakhte hain
const cache = new Map();
const CACHE_MS = 24 * 60 * 60 * 1000;

const clean = (value) => {
  const text = String(value || "").trim();
  return !text || text.toUpperCase() === "NA" ? "" : text;
};

// @desc    Pincode se state, district, block aur gaon/post office ke naam laata hai
// @route   GET /api/auth/pincode/:pincode
// @access  Private
export const lookupPincode = asyncHandler(async (req, res) => {
  const pincode = String(req.params.pincode || "").trim();
  if (!/^\d{6}$/.test(pincode)) {
    res.status(400);
    throw new Error("Pincode must be 6 digits");
  }

  const cached = cache.get(pincode);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return res.json({ success: true, data: cached.data });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let json;
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Pincode service returned ${response.status}`);
    json = await response.json();
  } catch (err) {
    console.warn("Pincode lookup failed:", err.message);
    res.status(502);
    throw new Error("Could not look up this pincode right now. You can type the details yourself.");
  } finally {
    clearTimeout(timer);
  }

  const entry = Array.isArray(json) ? json[0] : null;
  const offices =
    entry?.Status === "Success" && Array.isArray(entry.PostOffice) ? entry.PostOffice : [];

  if (offices.length === 0) {
    res.status(404);
    throw new Error("No details found for this pincode. Please check it, or type the details yourself.");
  }

  const places = [];
  const seen = new Set();
  offices.forEach((o) => {
    const name = clean(o.Name);
    if (!name || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    places.push({ name, block: clean(o.Block) });
  });

  const data = {
    pincode,
    state: clean(offices[0].State),
    district: clean(offices[0].District),
    places,
  };

  cache.set(pincode, { at: Date.now(), data });
  res.json({ success: true, data });
});