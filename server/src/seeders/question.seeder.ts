import { Types } from "mongoose";
import Question from "../models/Question";
import { normalizeOptionsForStorage } from "../utils/option.factory";
import { QUESTION_SUBJECTS } from "../constants/question.constants";

export const seedQuestions = async (teacherId: Types.ObjectId) => {
  const questions = await Question.insertMany([
    {
      text: "What does HTTP stand for?",
      options: normalizeOptionsForStorage([
        { text: "HyperText Transfer Protocol", isCorrect: true },
        { text: "HighText Transfer Protocol", isCorrect: false },
        { text: "Hyper Transfer Text Process", isCorrect: false },
        { text: "Hyper Tool Transfer Protocol", isCorrect: false },
      ]),
      subject: QUESTION_SUBJECTS[4],
      difficulty: "easy",
      createdBy: teacherId,
    },
    {
      text: "Which data structure uses FIFO order?",
      options: normalizeOptionsForStorage([
        { text: "Stack", isCorrect: false },
        { text: "Queue", isCorrect: true },
        { text: "Tree", isCorrect: false },
        { text: "Graph", isCorrect: false },
      ]),
      subject: QUESTION_SUBJECTS[1],
      difficulty: "medium",
      createdBy: teacherId,
    },
    {
      text: "What is the default port for Redis?",
      options: normalizeOptionsForStorage([
        { text: "5432", isCorrect: false },
        { text: "27017", isCorrect: false },
        { text: "6379", isCorrect: true },
        { text: "3306", isCorrect: false },
      ]),
      subject: QUESTION_SUBJECTS[0],
      difficulty: "easy",
      createdBy: teacherId,
    },
  ]);

  return questions;
};
