import User from "../models/User";
import { ROLES } from "../constants/roles";

export const seedUsers = async () => {
  const teacher = await User.create({
    fullName: "Default Teacher",
    email: "teacher@quizflow.com",
    password: "teacher123",
    role: ROLES.TEACHER,
  });

  const student = await User.create({
    fullName: "Default Student",
    email: "student@quizflow.com",
    password: "student123",
    role: ROLES.STUDENT,
  });

  return { teacher, student };
};
