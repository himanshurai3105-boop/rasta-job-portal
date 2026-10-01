import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Register = () => {
  const [role, setRole] = useState("jobseeker");
  const [form, setForm] = useState({ name: "", email: "", password: "", companyName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await register({ ...form, role });
      if (data.role === "employer") navigate("/employer/dashboard");
      else navigate("/jobs");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-12 md:py-20">
      <h1 className="font-display text-3xl md:text-4xl">Create your account</h1>
      <p className="text-muted mt-2">Takes less than a minute.</p>

      <div className="mt-6 flex gap-2 p-1 bg-ink/5 rounded-xl w-fit">
        <button
          onClick={() => setRole("jobseeker")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            role === "jobseeker" ? "bg-white shadow-sm" : "text-muted"
          }`}
        >
          I'm looking for work
        </button>
        <button
          onClick={() => setRole("employer")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            role === "employer" ? "bg-white shadow-sm" : "text-muted"
          }`}
        >
          I'm hiring
        </button>
      </div>

      {error && (
        <div className="mt-6 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Full name</label>
          <input
            required
            value={form.name}
            onChange={update("name")}
            className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
          />
        </div>
        {role === "employer" && (
          <div>
            <label className="text-sm font-medium">Company name</label>
            <input
              required
              value={form.companyName}
              onChange={update("companyName")}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
            />
          </div>
        )}
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={update("email")}
            className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={update("password")}
            className="w-full mt-1 px-4 py-3 rounded-xl border border-ink/10 focus-ring"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-ink text-paper font-medium hover:bg-amber-dark transition-colors focus-ring disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-muted mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-amber-dark font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
};

export default Register;
