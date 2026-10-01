import axios from "axios";

// In dev, VITE_API_URL is unset and requests go through Vite's proxy (see vite.config.js).
// In production, set VITE_API_URL to your deployed backend's URL (see .env.example).
const API_URL = import.meta.env.VITE_API_URL || "";

// The backend's origin without "/api" — used to build full links to uploaded
// files (resumes) which are served from the backend, not the frontend.
export const SERVER_ORIGIN = API_URL.replace(/\/api\/?$/, "");

const api = axios.create({
  baseURL: API_URL ? `${API_URL}` : "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rasta_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
