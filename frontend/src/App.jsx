import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Jobs from "./pages/Jobs.jsx";
import JobDetails from "./pages/JobDetails.jsx";
import PostJob from "./pages/PostJob.jsx";
import EmployerDashboard from "./pages/EmployerDashboard.jsx";
import JobApplicants from "./pages/JobApplicants.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import MyApplications from "./pages/MyApplications.jsx";
import SavedJobs from "./pages/SavedJobs.jsx";
import InterviewChat from "./pages/InterviewChat.jsx";
import MCQTest from "./pages/MCQTest.jsx";
import SalaryInsights from "./pages/SalaryInsights.jsx";
import Profile from "./pages/Profile.jsx";
import RecommendedJobs from "./pages/RecommendedJobs.jsx";
import CompanyProfile from "./pages/CompanyProfile.jsx";
import EditJob from "./pages/EditJob.jsx";
import EmployerAnalytics from "./pages/EmployerAnalytics.jsx";
import EmployerCandidates from "./pages/EmployerCandidates.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/salary-insights" element={<SalaryInsights />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:slug" element={<JobDetails />} />

          <Route
            path="/employer/post"
            element={
              <ProtectedRoute allowedRoles={["employer"]}>
                <PostJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/dashboard"
            element={
              <ProtectedRoute allowedRoles={["employer"]}>
                <EmployerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/jobs/:jobId/applicants"
            element={
              <ProtectedRoute allowedRoles={["employer"]}>
                <JobApplicants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/jobs/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["employer"]}>
                <EditJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/analytics"
            element={
              <ProtectedRoute allowedRoles={["employer"]}>
                <EmployerAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/candidates"
            element={
              <ProtectedRoute allowedRoles={["employer"]}>
                <EmployerCandidates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute allowedRoles={["jobseeker"]}>
                <MyApplications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute allowedRoles={["jobseeker"]}>
                <SavedJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/:id"
            element={
              <ProtectedRoute allowedRoles={["jobseeker"]}>
                <InterviewChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mcq-test/:id"
            element={
              <ProtectedRoute allowedRoles={["jobseeker"]}>
                <MCQTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommended"
            element={
              <ProtectedRoute allowedRoles={["jobseeker"]}>
                <RecommendedJobs />
              </ProtectedRoute>
            }
          />
          <Route path="/company/:employerId" element={<CompanyProfile />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <footer className="border-t border-ink/10 py-8 text-center text-sm text-muted">
        rasta — built for people between jobs and the jobs waiting for them.
      </footer>
    </div>
  );
}

export default App;
