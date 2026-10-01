import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios.js";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto px-6 py-12 md:py-20 text-center">
        <h1 className="font-display text-3xl">Password updated</h1>
        <p className="text-muted mt-3">Redirecting you to log in...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12 md:py-20">
      <h1 className="font-display text-3xl md:text-4xl">Set a new password</h1>
      <p className="text-muted mt-2">Choose something you haven't used before.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
        <div>
          <label className="text-sm font-medium">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
          />
          <p className="text-xs text-muted mt-1">At least 8 characters, with a letter and a number.</p>
        </div>
        <div>
          <label className="text-sm font-medium">Confirm new password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-ink text-paper font-medium hover:bg-amber-dark transition-colors focus-ring disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>

      <p className="text-sm text-muted mt-6">
        <Link to="/login" className="text-amber-dark font-medium hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
};

export default ResetPassword;
