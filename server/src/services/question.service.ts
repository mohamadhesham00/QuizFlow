import Question from "../models/Question";
import XLSX from "xlsx";
import { deleteCloudinaryImageByUrl } from "../utils/cloudinary";
import { normalizeOptionsForStorage } from "../utils/option.factory";
import {
  type QuestionDifficulty,
  type QuestionSubject,
  toQuestionDifficulty,
  toQuestionSubject,
} from "../constants/question.constants";
import {
  buildQuestionFilter,
  type QuestionListQuery,
  resolveQuestionSort,
} from "../utils/filters/question.filter";
import { toQuestionDto } from "../dtos/question.dto";

type QuestionOptionInput = {
  text: string;
  isCorrect: boolean;
};

const QUESTION_RELATIONS = {
  path: "createdBy",
  select: "fullName email role",
} as const;

export const createQuestionEntry = async (input: {
  text: string;
  options: QuestionOptionInput[];
  subject?: QuestionSubject;
  difficulty?: QuestionDifficulty;
  tags?: string[];
  estimatedTimeSeconds?: number;
  points?: number;
  userId?: string;
}) => {
  const question = await Question.create({
    text: input.text,
    options: normalizeOptionsForStorage(input.options),
    subject: input.subject,
    difficulty: input.difficulty,
    tags: input.tags,
    estimatedTimeSeconds: input.estimatedTimeSeconds,
    points: input.points,
    createdBy: input.userId,
  });

  const hydrated = await Question.findById(question._id).populate(
    QUESTION_RELATIONS,
  );

  return toQuestionDto((hydrated || question).toObject());
};

export const getAllQuestions = async (query: QuestionListQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = buildQuestionFilter(query);
  const { sortBy, sortOrder } = resolveQuestionSort(query);

  const [items, total] = await Promise.all([
    Question.find(filter)
      .populate(QUESTION_RELATIONS)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    Question.countDocuments(filter),
  ]);

  return {
    items: items.map((item) => toQuestionDto(item.toObject())),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getQuestionEntryById = async (id: string) => {
  const question = await Question.findById(id).populate(QUESTION_RELATIONS);
  if (!question) {
    const error = new Error("Question not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  return toQuestionDto(question.toObject());
};

export const updateQuestionEntry = async (
  id: string,
  payload: Record<string, unknown>,
) => {
  const normalizedPayload = { ...payload };

  if (Array.isArray(normalizedPayload.options)) {
    normalizedPayload.options = normalizeOptionsForStorage(
      normalizedPayload.options as QuestionOptionInput[],
    );
  }

  const question = await Question.findByIdAndUpdate(id, normalizedPayload, {
    returnDocument: "after",
    runValidators: true,
  }).populate(QUESTION_RELATIONS);

  if (!question) {
    const error = new Error("Question not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  return toQuestionDto(question.toObject());
};

export const deleteQuestionEntry = async (id: string) => {
  const question = await Question.findByIdAndDelete(id);
  if (!question) {
    const error = new Error("Question not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  return { message: "Question deleted" };
};

export const attachQuestionImage = async (id: string, imageUrl: string) => {
  const existingQuestion = await Question.findById(id);
  if (!existingQuestion) {
    await deleteCloudinaryImageByUrl(imageUrl);
    const error = new Error("Question not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  if (existingQuestion.imageUrl && existingQuestion.imageUrl !== imageUrl) {
    await deleteCloudinaryImageByUrl(existingQuestion.imageUrl);
  }

  const question = await Question.findByIdAndUpdate(
    id,
    { imageUrl },
    { returnDocument: "after" },
  ).populate(QUESTION_RELATIONS);
  if (!question) {
    const error = new Error("Question not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  return toQuestionDto(question.toObject());
};

export const deleteQuestionImage = async (id: string) => {
  const existingQuestion = await Question.findById(id);
  if (!existingQuestion) {
    const error = new Error("Question not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  if (existingQuestion.imageUrl) {
    await deleteCloudinaryImageByUrl(existingQuestion.imageUrl);
  }

  const question = await Question.findByIdAndUpdate(
    id,
    { imageUrl: "" },
    { returnDocument: "after" },
  ).populate(QUESTION_RELATIONS);
  if (!question) {
    const error = new Error("Question not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  return toQuestionDto(question.toObject());
};
