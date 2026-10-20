// Query ke har word ko alag-alag match karta hai.
// "noida sector 15" -> "Sector 15, Noida, Uttar Pradesh, India" bhi match hoga
export const matchesQuery = (text, query) => {
  const tokens = query.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const haystack = text.toLowerCase();
  return tokens.every((t) => haystack.includes(t));
};

// Match hue items ko best-first order mein lagata hai
export const rankMatches = (list, query, limit = 8) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const score = (item) => {
    const l = item.toLowerCase();
    if (l === q) return 0;
    if (l.startsWith(q)) return 1;
    if (l.split(/[\s,]+/).some((w) => w.startsWith(q))) return 2;
    return 3;
  };

  return list
    .filter((item) => matchesQuery(item, q))
    .map((item, index) => ({ item, index, s: score(item) }))
    .sort((a, b) => a.s - b.s || a.index - b.index)
    .slice(0, limit)
    .map((x) => x.item);
};

// Case ignore karke duplicate hata deta hai
export const uniqueCI = (list) => {
  const seen = new Set();
  return list.filter((item) => {
    const key = String(item).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};