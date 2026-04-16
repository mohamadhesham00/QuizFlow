import dotenv from "dotenv";
import connectDB from "../config/db";
import { connectRedis, redisClient } from "../config/redis";
import User from "../models/User";
import { seedUsers } from "./user.seeder";

dotenv.config();

const runSeeders = async (): Promise<void> => {
  await connectDB();
  await connectRedis();

  await Promise.all([User.deleteMany({})]);

  const { teacher } = await seedUsers();

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
