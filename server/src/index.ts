import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import { connectRedis } from "./config/redis";

const app: Application = express();
dotenv.config();

// Connect to Database
connectDB();
connectRedis();

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("QuizFlow API is running");
});

app.use((req: Request, res: Response) => {
  res
    .status(404)
    .json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
