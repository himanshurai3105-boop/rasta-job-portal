import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { calculateCompletion, COMPLETION_THRESHOLD } from "../utils/profileCompletion.js";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.role === "admin") navigate("/admin");
      else if (data.role === "employer") navigate("/employer/dashboard");
      // Ek baar complete ho chuka profile hamesha seedha Jobs page par jayega
      else if (data.profileCompleted || calculateCompletion(data) >= COMPLETION_THRESHOLD) navigate("/jobs");
      else navigate("/profile", { state: { incomplete: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-12 md:py-20">
      <h1 className="font-display text-3xl md:text-4xl">Welcome back</h1>
      <p className="text-muted mt-2">Log in to continue to rasta.</p>

      {error && (
        <div className="mt-6 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Password</label>
            <Link to="/forgot-password" className="text-xs text-amber-dark hover:underline focus-ring rounded">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-ink text-paper font-medium hover:bg-amber-dark transition-colors focus-ring disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="text-sm text-muted mt-6">
        New here?{" "}
        <Link to="/register" className="text-amber-dark font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
};

export default Login;