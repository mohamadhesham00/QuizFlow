import { Types } from "mongoose";
import Exam from "../models/Exam";
import Question from "../models/Question";
import { shuffleArray } from "../utils/shuffle";

const buildForms = (questions: Awaited<ReturnType<typeof Question.find>>) => {
  return Array.from({ length: 4 }, (_, index) => ({
    formNumber: index + 1,
    questions: shuffleArray(questions).map((question) => {
      const shuffledOptions = shuffleArray(question.options).map((option) => ({
        optionId: option.optionId,
        text: option.text,
      }));

      const correct = question.options.find((option) => option.isCorrect);

      return {
        questionId: question._id.toString(),
        text: question.text,
        imageUrl: question.imageUrl,
        options: shuffledOptions,
        correctOptionId: correct?.optionId || "",
      };
    }),
  }));
};

export const seedExam = async (input: {
  teacherId: Types.ObjectId;
  questions: Awaited<ReturnType<typeof Question.insertMany>>;
}) => {
  return Exam.create({
    title: "Sample CS Exam",
    description: "Seeded sample exam",
    questionIds: input.questions.map((q) => q._id),
    forms: buildForms(input.questions),
    isPublished: true,
    createdBy: input.teacherId,
  });
};
