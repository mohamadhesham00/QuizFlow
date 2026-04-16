import { Request, Response } from "express";
import {
  createExamWithForms,
  deleteExamById,
  exportExamResultsToExcel,
  getExamAnalytics,
  getExamAttemptDetail,
  getExamEntryById,
  getExamFormsForQa,
  getExamResults,
  listTeacherExams,
  publishExamById,
  unpublishExamById,
  updateAttemptTimerByTeacher,
  updateExamById,
} from "../services/exam.service";

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

export const createExam = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const exam = await createExamWithForms({
      ...req.body,
      createdBy: req.user?.userId,
    });
    res.status(201).json(exam);
  } catch (error) {
    handleError(res, error, "Failed to create exam");
  }
};

export const updateExam = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const exam = await updateExamById(String(req.params.id), req.body);
    res.status(200).json(exam);
  } catch (error) {
    handleError(res, error, "Failed to update exam");
  }
};

export const listExams = async (req: Request, res: Response): Promise<void> => {
  try {
    const exams = await listTeacherExams(req.user?.userId);
    res.status(200).json(exams);
  } catch (error) {
    handleError(res, error, "Failed to fetch exams");
  }
};

export const getExamById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const exam = await getExamEntryById(String(req.params.id));
    res.status(200).json(exam);
  } catch (error) {
    handleError(res, error, "Failed to fetch exam");
  }
};

export const getExamForms = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await getExamFormsForQa(String(req.params.id));
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Failed to fetch exam forms");
  }
};

export const publishExam = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const exam = await publishExamById(String(req.params.id));
    res.status(200).json(exam);
  } catch (error) {
    handleError(res, error, "Failed to publish exam");
  }
};

export const unpublishExam = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const exam = await unpublishExamById(String(req.params.id));
    res.status(200).json(exam);
  } catch (error) {
    handleError(res, error, "Failed to unpublish exam");
  }
};

export const removeExam = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await deleteExamById(String(req.params.id));
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Failed to delete exam");
  }
};

export const getResults = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await getExamResults(String(req.params.id), {
      from: req.query.from ? new Date(String(req.query.from)) : undefined,
      to: req.query.to ? new Date(String(req.query.to)) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
    });
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Failed to fetch exam results");
  }
};

export const getAttemptDetail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await getExamAttemptDetail(
      String(req.params.id),
      String(req.params.attemptId),
    );
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Failed to fetch attempt detail");
  }
};

export const getAnalytics = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await getExamAnalytics(String(req.params.id));
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Failed to fetch analytics");
  }
};

export const exportExamResults = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { fileBuffer, filename } = await exportExamResultsToExcel(
      String(req.params.id),
      {
        from: req.query.from ? new Date(String(req.query.from)) : undefined,
        to: req.query.to ? new Date(String(req.query.to)) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
      },
    );
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.status(200).send(fileBuffer);
  } catch (error) {
    handleError(res, error, "Failed to export results");
  }
};

export const updateAttemptTimer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await updateAttemptTimerByTeacher({
      examId: String(req.params.id),
      attemptId: String(req.params.attemptId),
      extraSeconds: req.body.extraSeconds,
      remainingSeconds: req.body.remainingSeconds,
    });
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Failed to update attempt timer");
  }
};
