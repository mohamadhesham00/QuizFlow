import dotenv from "dotenv";
import connectDB from "../config/db";
import { connectRedis, redisClient } from "../config/redis";
import User from "../models/User";
import Question from "../models/Question";
import Exam from "../models/Exam";
import { seedUsers } from "./user.seeder";
import { seedQuestions } from "./question.seeder";
import { seedExam } from "./exam.seeder";

dotenv.config();

const runSeeders = async (): Promise<void> => {
  await connectDB();
  await connectRedis();

  await Promise.all([
    Exam.deleteMany({}),
    Question.deleteMany({}),
    User.deleteMany({}),
  ]);

  const { teacher } = await seedUsers();
  const questions = await seedQuestions(teacher._id);
  await seedExam({ teacherId: teacher._id, questions });

  console.log("✅ Seed completed");
  console.log("Teacher login: teacher@quizflow.com / teacher123");
  console.log("Student login: student@quizflow.com / student123");

  await redisClient.quit();
  process.exit(0);
};

runSeeders().catch(async (error) => {
  console.error("❌ Seed failed", error);
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
  process.exit(1);
});
