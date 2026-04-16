# QuizFlow Server API

TypeScript + Express backend for a simplified examination system.

## Features

- JWT authentication with role-based authorization (`teacher`, `student`)
- Question bank CRUD with image upload (Cloudinary)
- Exam generation with **4 randomized forms** (question and option shuffling)
- Random student form assignment when exam starts
- Solving time tracking using Redis timers
- Instant result feedback on submission
- Excel export of student attempts/results
- Seed script with sample teacher, student, questions, and exam

## Tech Stack

- Node.js + Express + TypeScript
- MongoDB + Mongoose
- Redis
- Cloudinary + Multer
- Zod input validation
- XLSX export

## Setup

1. From the repo root, run the full stack with Docker:
   - `docker compose up --build`
2. If you want to use image uploads, set the Cloudinary values in the root `.env` file based on [.env.example](../.env.example)

Required environment variables:

- `PORT=5000`
- `MONGO_URI=mongodb://mongo:27017/QuizFlow`
- `REDIS_URL=redis://redis:6379`
- `JWT_SECRET=your_super_secret`
- `JWT_EXPIRES_IN=1d` (optional)
- `CLOUDINARY_CLOUD_NAME=...`
- `CLOUDINARY_API_KEY=...`
- `CLOUDINARY_API_SECRET=...`

Docker routes:

- Frontend: `http://localhost:5000`
- API: `http://localhost:5001`

## Run

- Dockerized full stack: `docker compose up --build` from the repo root
- Development: `npm run dev`
- Build: `npm run build`
- Production: `npm start`

## Seed Data

- `npm run seed`

Seeded credentials:

- Teacher: `teacher@quizflow.com` / `teacher123`
- Student: `student@quizflow.com` / `student123`

## API Documentation

See [docs/endpoints.yaml](docs/endpoints.yaml) for OpenAPI YAML import.
Auth is currently login-only (`POST /api/auth/login`).
