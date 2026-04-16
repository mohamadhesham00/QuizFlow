# QuizFlow Docker Setup

Run the entire stack with Docker only:

```bash
docker compose up --build
```

What starts:

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:5000](http://localhost:5000)
- MongoDB and Redis inside the compose network
- Seed data on first startup

Seeded logins:

- Teacher: `teacher@quizflow.com` / `teacher123`
- Student: `student@quizflow.com` / `student123`

If you need image uploads, copy `.env.example` to `.env` and fill in the Cloudinary values before running Compose.

To stop and remove the stack:

```bash
docker compose down
```

To also wipe MongoDB data:

```bash
docker compose down -v
```
