import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
      if (res.data.devResetUrl) setDevResetUrl(res.data.devResetUrl);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-12 md:py-20">
      <h1 className="font-display text-3xl md:text-4xl">Forgot your password?</h1>
      <p className="text-muted mt-2">Enter your email and we'll send you a reset link.</p>

      {submitted ? (
        <div className="mt-8 p-5 rounded-2xl bg-success/10 text-success text-sm">
          If an account exists for <strong>{email}</strong>, a reset link has been sent — check your inbox.
          {devResetUrl && (
            <p className="mt-3 text-xs text-ink/70 break-all">
              (Dev mode — email isn't configured, use this link directly:{" "}
              <Link to={devResetUrl.replace(window.location.origin, "")} className="underline">
                {devResetUrl}
              </Link>
              )
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
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
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-ink text-paper font-medium hover:bg-amber-dark transition-colors focus-ring disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <p className="text-sm text-muted mt-6">
        Remembered it?{" "}
        <Link to="/login" className="text-amber-dark font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
