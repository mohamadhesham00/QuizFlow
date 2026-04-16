# QuizFlow Frontend (React + TypeScript)

This folder contains a TypeScript React implementation of the QuizFlow UI, converted from static HTML pages into reusable components and routed pages.

## Tech

- React 18
- TypeScript
- Vite
- React Router
- Axios

## Implemented Pages

- `/login` - login page
- `/teacher/questions` - question bank CRUD view
- `/teacher/exams` - exam builder and publish
- `/teacher/results` - export results
- `/student` - student portal / start exam
- `/student/live` - live exam attempt UI + solving time
- `/student/result` - instant feedback page

## Project Structure

- `src/components` shared UI/layout components
- `src/pages` route-level screens by role (`auth`, `teacher`, `student`)
- `src/lib` API client and auth storage
- `src/types` API-facing TypeScript models
- `docs/MISSING_API_GAPS.md` missing backend APIs and recommendations

## Setup

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - copy `.env.example` to `.env`
   - set `VITE_API_BASE_URL` if your backend URL is different
3. Run dev server:
   - `npm run dev`
4. Build for production:
   - `npm run build`
5. Preview build:
   - `npm run preview`

## Notes

- Auth token and user profile are stored in `localStorage`.
- Current auth scope is login/logout only.
- Backend must follow the documented API contract from your OpenAPI spec.
- For production, replace localStorage token handling with a hardened session strategy (httpOnly cookies/refresh flow).
