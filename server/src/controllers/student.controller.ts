import { Request, Response } from "express";
import {
  getAvailableStudentExams,
  getStudentAttemptQuestions,
  getStudentAttemptResult,
  getStudentAttemptState,
  getStudentAttemptTimer,
  heartbeatStudentAttempt,
  listStudentAttempts,
  saveDraftAnswers,
  startStudentExam,
  submitStudentAttempt,
} from "../services/student.service";

const handleError = (
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void => {
  const statusCode =
    error instanceof Error
      ? (error as Error & { statusCode?: number }).statusCode || 500
      : 500;
  res.status(statusCode).json({
    message: error instanceof Error ? error.message : fallbackMessage,
  });
};

export const listAvailableExams = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const exams = await getAvailableStudentExams(req.user?.userId);
    res.status(200).json(exams);
  } catch (error) {
    handleError(res, error, "Failed to list available exams");
  }
};

export const startExam = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await startStudentExam({
      examId: String(req.params.examId),
      studentId: req.user?.userId,
    });
    res.status(result.created ? 201 : 200).json({
      message: result.created ? undefined : "Existing started attempt returned",
      attemptId: result.attemptId,
      formNumber: result.formNumber,
    });
  } catch (error) {
    handleError(res, error, "Failed to start exam");
  }
};

export const getAttemptQuestions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const payload = await getStudentAttemptQuestions({
      attemptId: String(req.params.attemptId),
      studentId: req.user?.userId,
    });
    res.status(200).json(payload);
  } catch (error) {
    handleError(res, error, "Failed to fetch attempt questions");
  }
};

export const saveAttemptAnswers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await saveDraftAnswers({
      attemptId: String(req.params.attemptId),
      studentId: req.user?.userId,
      answers: req.body.answers,
    });
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Failed to save draft answers");
  }
};

export const getAttemptState = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await getStudentAttemptState({
      attemptId: String(req.params.attemptId),
      studentId: req.user?.userId,
    });
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Failed to fetch attempt state");
  }
};

export const getAttemptTimer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await getStudentAttemptTimer({
      attemptId: String(req.params.attemptId),
      studentId: req.user?.userId,
    });
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Failed to fetch timer");
  }
};

export const heartbeatAttempt = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await heartbeatStudentAttempt({
      attemptId: String(req.params.attemptId),
      studentId: req.user?.userId,
    });
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Failed to register heartbeat");
  }
};

export const submitAttempt = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await submitStudentAttempt({
      attemptId: String(req.params.attemptId),
      studentId: req.user?.userId,
      answers: req.body.answers,
    });

    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Failed to submit exam");
  }
};

export const getAttemptResult = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await getStudentAttemptResult({
      attemptId: String(req.params.attemptId),
      studentId: req.user?.userId,
    });
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Failed to fetch attempt result");
  }
};

export const myAttempts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const attempts = await listStudentAttempts(req.user?.userId);
    res.status(200).json(attempts);
  } catch (error) {
    handleError(res, error, "Failed to fetch attempts");
  }
};
