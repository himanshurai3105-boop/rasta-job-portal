# rasta — Job Portal (MERN)

Full-stack job portal with 3 roles: **Job Seeker**, **Employer**, **Admin**.

## Stack
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT auth, bcrypt
- **Frontend**: React (Vite), React Router, Tailwind CSS, Axios

## Features
- Auth: register/login for job seekers & employers, JWT-protected routes, role-based access
- Jobs: create/edit/close postings, search + filters (keyword, location, job type, work mode), pagination
- Applications: apply once per job, cover note, employer pipeline (applied → shortlisted → interview → rejected/hired)
- Employer dashboard: manage postings, view applicants, update statuses
- Admin dashboard: platform stats, block/unblock users, moderate job postings

## Setup

### 1. Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas connection string)

### 2. Backend
```bash
cd backend
cp .env.example .env
# edit .env — set MONGO_URI and JWT_SECRET
npm install
npm run dev
```
Backend runs on `http://localhost:5000`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173` and proxies `/api` requests to the backend.

### 4. Create an admin user
There's no public admin signup (by design). After registering a normal user via the UI,
promote them manually in MongoDB:
```js
// in mongosh, connected to your job_portal database
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```

## Project structure
```
job-portal/
├── backend/
│   ├── config/db.js
│   ├── controllers/        # auth, job, application, admin
│   ├── middleware/         # auth (protect/authorize), error handling
│   ├── models/             # User, Job, Application
│   ├── routes/
│   ├── utils/generateToken.js
│   └── server.js
└── frontend/
    └── src/
        ├── api/axios.js        # axios instance w/ JWT interceptor
        ├── context/AuthContext.jsx
        ├── components/         # Navbar, JobCard, ProtectedRoute
        └── pages/               # Home, Login, Register, Jobs, JobDetails,
                                  # PostJob, EmployerDashboard, JobApplicants,
                                  # MyApplications, AdminDashboard
```

## Next steps (production hardening)
- Add real resume/file upload (currently `resumeUrl` is a plain string field — wire up `multer` + S3/Cloudinary)
- Add email notifications (application received, status changes)
- Add rate limiting (`express-rate-limit`) and input validation (`zod`/`joi`) on all routes
- Add refresh tokens / token rotation instead of long-lived JWTs
- Add tests (Jest + Supertest for backend, Vitest + React Testing Library for frontend)
- Deploy: backend → Render/Railway/EC2, frontend → Vercel/Netlify, DB → MongoDB Atlas
