import axios from "axios";

// In dev, VITE_API_URL is unset and requests go through Vite's proxy (see vite.config.js).
// In production, set VITE_API_URL to your deployed backend's URL (see .env.example).
const API_URL = import.meta.env.VITE_API_URL || "";

// The backend's origin without "/api" — purane uploaded files (/uploads/...)
// ke full links banane ke liye.
export const SERVER_ORIGIN = API_URL.replace(/\/api\/?$/, "");

// Resume / photo ka sahi link banata hai:
// - Cloudinary ka poora https link jaisa hai waisa rahega
// - purana "/uploads/..." link server ke address ke saath judega
export const fileUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${SERVER_ORIGIN}${path}`;
};

const api = axios.create({
  baseURL: API_URL ? `${API_URL}` : "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rasta_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;