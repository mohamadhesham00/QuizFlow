import { Request, Response } from "express";
import {
  attachQuestionImage,
  createQuestionEntry,
  deleteQuestionImage,
  deleteQuestionEntry,
  getAllQuestions,
  getQuestionEntryById,
  updateQuestionEntry,
} from "../services/question.service";
import {
  toQuestionDifficulty,
  toQuestionSubject,
} from "../constants/question.constants";

export const createQuestion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const question = await createQuestionEntry({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(question);
  } catch (error) {
    const statusCode =
      error instanceof Error
        ? (error as Error & { statusCode?: number }).statusCode || 500
        : 500;
    res.status(statusCode).json({
      message:
        error instanceof Error ? error.message : "Failed to create question",
    });
  }
};

export const getQuestions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const subject = toQuestionSubject(req.query.subject);

    const questions = await getAllQuestions({
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      subject,
      difficulty: toQuestionDifficulty(req.query.difficulty),
      tag: req.query.tag ? String(req.query.tag) : undefined,
      sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined,
      sortOrder: req.query.sortOrder
        ? (String(req.query.sortOrder) as "asc" | "desc")
        : undefined,
    });
    res.status(200).json(questions);
  } catch (error) {
    const statusCode =
      error instanceof Error
        ? (error as Error & { statusCode?: number }).statusCode || 500
        : 500;
    res.status(statusCode).json({
      message:
        error instanceof Error ? error.message : "Failed to fetch questions",
    });
  }
};

export const getQuestionById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const question = await getQuestionEntryById(String(req.params.id));
    res.status(200).json(question);
  } catch (error) {
    const statusCode =
      error instanceof Error
        ? (error as Error & { statusCode?: number }).statusCode || 500
        : 500;
    res.status(statusCode).json({
      message:
        error instanceof Error ? error.message : "Failed to fetch question",
    });
  }
};

export const updateQuestion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const question = await updateQuestionEntry(String(req.params.id), req.body);
    res.status(200).json(question);
  } catch (error) {
    const statusCode =
      error instanceof Error
        ? (error as Error & { statusCode?: number }).statusCode || 500
        : 500;
    res.status(statusCode).json({
      message:
        error instanceof Error ? error.message : "Failed to update question",
    });
  }
};

export const deleteQuestion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await deleteQuestionEntry(String(req.params.id));
    res.status(200).json(result);
  } catch (error) {
    const statusCode =
      error instanceof Error
        ? (error as Error & { statusCode?: number }).statusCode || 500
        : 500;
    res.status(statusCode).json({
      message:
        error instanceof Error ? error.message : "Failed to delete question",
    });
  }
};

export const uploadQuestionImage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "Image file is required" });
      return;
    }

    const imageUrl = (req.file as Express.Multer.File & { path?: string }).path;
    const question = await attachQuestionImage(String(req.params.id), imageUrl);
    res.status(200).json(question);
  } catch (error) {
    const statusCode =
      error instanceof Error
        ? (error as Error & { statusCode?: number }).statusCode || 500
        : 500;
    res.status(statusCode).json({
      message:
        error instanceof Error ? error.message : "Failed to upload image",
    });
  }
};

export const removeQuestionImage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const question = await deleteQuestionImage(String(req.params.id));
    res.status(200).json(question);
  } catch (error) {
    const statusCode =
      error instanceof Error
        ? (error as Error & { statusCode?: number }).statusCode || 500
        : 500;
    res.status(statusCode).json({
      message:
        error instanceof Error ? error.message : "Failed to delete image",
    });
  }
};
