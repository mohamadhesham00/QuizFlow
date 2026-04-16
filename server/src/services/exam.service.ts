import Attempt from "../models/Attempt";
import Exam, { IFormQuestion } from "../models/Exam";
import Question from "../models/Question";
import mongoose from "mongoose";
import { shuffleArray } from "../utils/shuffle";
import { buildResultsWorkbookBuffer } from "../utils/excel";
import { redisClient } from "../config/redis";
import { toExamDto, toExamListItemDto } from "../dtos/exam.dto";

const ensureValidObjectId = (value: string, fieldName: string) => {
  if (!mongoose.isValidObjectId(value)) {
    const error = new Error(`Invalid ${fieldName}`);
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
};

const generateForms = (
  questions: Awaited<ReturnType<typeof Question.find>>,
): { formNumber: number; questions: IFormQuestion[] }[] => {
  const forms = [];

  for (let i = 1; i <= 4; i += 1) {
    const formQuestions: IFormQuestion[] = shuffleArray(questions).map(
      (question) => {
        const shuffledOptions = shuffleArray(question.options);
        const correct = shuffledOptions.find((opt) => opt.isCorrect);

        return {
          questionId: question._id.toString(),
          text: question.text,
          imageUrl: question.imageUrl,
          options: shuffledOptions.map((option) => ({
            optionId: option.optionId,
            text: option.text,
          })),
          correctOptionId: correct?.optionId || "",
        };
      },
    );

    forms.push({
      formNumber: i,
      questions: formQuestions,
    });
  }

  return forms;
};

const EXAM_RELATIONS = [
  { path: "createdBy", select: "fullName email role" },
  {
    path: "questionIds",
    select: "text subject difficulty points estimatedTimeSeconds",
  },
] as const;

const populateExamRelations = <T extends { populate: (...args: never[]) => T }>(
  query: T,
): T => {
  return EXAM_RELATIONS.reduce(
    (current, relation) => current.populate(relation as never),
    query,
  );
};

export const createExamWithForms = async (input: {
  title: string;
  description?: string;
  questionIds: string[];
  startsAt?: Date;
  endsAt?: Date;
  durationSeconds?: number;
  allowLateSubmission?: boolean;
  createdBy?: string;
}) => {
  const questions = await Question.find({ _id: { $in: input.questionIds } });
  if (!questions.length) {
    const error = new Error("No valid questions found");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  const created = await Exam.create({
    title: input.title,
    description: input.description,
    questionIds: input.questionIds,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    durationSeconds: input.durationSeconds,
    allowLateSubmission: input.allowLateSubmission,
    forms: generateForms(questions),
    createdBy: input.createdBy,
  });

  const exam = await populateExamRelations(Exam.findById(created._id));
  return toExamDto((exam || created).toObject());
};

export const listTeacherExams = async (teacherId?: string) => {
  if (!teacherId) {
    const error = new Error("Unauthorized");
    (error as Error & { statusCode?: number }).statusCode = 401;
    throw error;
  }

  const exams = await populateExamRelations(
    Exam.find({ createdBy: teacherId }).sort({ createdAt: -1 }),
  );

  return exams
    .map((exam) => toExamListItemDto(exam.toObject()))
    .filter((exam): exam is NonNullable<typeof exam> => exam !== null);
};

export const updateExamById = async (
  id: string,
  payload: {
    title?: string;
    description?: string;
    questionIds?: string[];
    startsAt?: Date;
    endsAt?: Date;
    durationSeconds?: number;
    allowLateSubmission?: boolean;
    isPublished?: boolean;
  },
) => {
  ensureValidObjectId(id, "exam id");

  const updatePayload: Record<string, unknown> = {
    title: payload.title,
    description: payload.description,
    startsAt: payload.startsAt,
    endsAt: payload.endsAt,
    durationSeconds: payload.durationSeconds,
    allowLateSubmission: payload.allowLateSubmission,
    isPublished: payload.isPublished,
  };

  if (payload.questionIds?.length) {
    const questions = await Question.find({
      _id: { $in: payload.questionIds },
    });
    if (!questions.length) {
      const error = new Error("No valid questions found");
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }

    updatePayload.questionIds = payload.questionIds;
    updatePayload.forms = generateForms(questions);
  }

  const exam = await Exam.findByIdAndUpdate(id, updatePayload, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const hydrated = await populateExamRelations(Exam.findById(exam._id));
  return toExamDto((hydrated || exam).toObject());
};

export const getExamEntryById = async (id: string) => {
  ensureValidObjectId(id, "exam id");

  const exam = await populateExamRelations(Exam.findById(id));
  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  return toExamDto(exam.toObject());
};

export const publishExamById = async (id: string) => {
  ensureValidObjectId(id, "exam id");

  const exam = await Exam.findByIdAndUpdate(
    id,
    { isPublished: true },
    { returnDocument: "after" },
  );
  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const hydrated = await populateExamRelations(Exam.findById(exam._id));
  return toExamDto((hydrated || exam).toObject());
};

export const unpublishExamById = async (id: string) => {
  ensureValidObjectId(id, "exam id");

  const exam = await Exam.findByIdAndUpdate(
    id,
    { isPublished: false },
    { returnDocument: "after" },
  );
  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const hydrated = await populateExamRelations(Exam.findById(exam._id));
  return toExamDto((hydrated || exam).toObject());
};

export const deleteExamById = async (id: string) => {
  ensureValidObjectId(id, "exam id");

  const exam = await Exam.findByIdAndDelete(id);
  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  await Attempt.deleteMany({ examId: id });
  return { message: "Exam deleted" };
};

export const getExamFormsForQa = async (id: string) => {
  ensureValidObjectId(id, "exam id");

  const exam = await populateExamRelations(Exam.findById(id));
  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const mapped = toExamDto(exam.toObject());

  return {
    examId: mapped.id,
    title: mapped.title,
    forms: mapped.forms,
  };
};

const mapAttemptsForResultRows = (
  examTitle: string,
  attempts: Awaited<ReturnType<typeof Attempt.find>>,
) => {
  return attempts.map((attempt) => ({
    attemptId: attempt._id,
    studentId: (attempt.studentId as any)?._id,
    studentName: (attempt.studentId as any).fullName,
    studentEmail: (attempt.studentId as any).email,
    examTitle,
    formNumber: attempt.formNumber,
    status: attempt.status,
    score: attempt.score || 0,
    totalQuestions: attempt.totalQuestions || 0,
    solvingTimeSeconds: attempt.solvingTimeSeconds || 0,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt || null,
  }));
};

export const getExamResults = async (
  id: string,
  filters?: { from?: Date; to?: Date; status?: string },
) => {
  ensureValidObjectId(id, "exam id");

  const exam = await Exam.findById(id);
  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const query: Record<string, unknown> = { examId: exam._id };
  if (filters?.status) {
    query.status = filters.status;
  }
  if (filters?.from || filters?.to) {
    query.createdAt = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    };
  }

  const attempts = await Attempt.find(query)
    .populate("studentId", "fullName email")
    .sort({ createdAt: -1 });
  return {
    exam: {
      id: exam._id,
      title: exam.title,
      isPublished: exam.isPublished,
    },
    results: mapAttemptsForResultRows(exam.title, attempts),
  };
};

export const getExamAttemptDetail = async (id: string, attemptId: string) => {
  ensureValidObjectId(id, "exam id");
  ensureValidObjectId(attemptId, "attempt id");

  const exam = await Exam.findById(id);
  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const attempt = await Attempt.findOne({
    _id: attemptId,
    examId: id,
  }).populate("studentId", "fullName email");
  if (!attempt) {
    const error = new Error("Attempt not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  return {
    exam: { id: exam._id, title: exam.title },
    attempt,
  };
};

export const getExamAnalytics = async (id: string) => {
  ensureValidObjectId(id, "exam id");

  const exam = await Exam.findById(id);
  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const attempts = await Attempt.find({ examId: id, status: "submitted" });
  const totalAttempts = attempts.length;
  const scores = attempts.map((a) => a.score || 0);
  const totalQuestions = attempts[0]?.totalQuestions || 0;
  const percentages =
    totalQuestions > 0 ? scores.map((s) => (s / totalQuestions) * 100) : [];
  const solvingTimes = attempts.map((a) => a.solvingTimeSeconds || 0);

  const avgScore = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;
  const avgSolvingTimeSeconds = solvingTimes.length
    ? solvingTimes.reduce((a, b) => a + b, 0) / solvingTimes.length
    : 0;
  const passRate = percentages.length
    ? (percentages.filter((p) => p >= 50).length / percentages.length) * 100
    : 0;

  const itemStats = new Map<string, { correct: number; total: number }>();
  attempts.forEach((attempt) => {
    attempt.answers.forEach((answer) => {
      const current = itemStats.get(answer.questionId) || {
        correct: 0,
        total: 0,
      };
      current.total += 1;
      if (answer.isCorrect) {
        current.correct += 1;
      }
      itemStats.set(answer.questionId, current);
    });
  });

  return {
    exam: { id: exam._id, title: exam.title },
    totalAttempts,
    averageScore: Number(avgScore.toFixed(2)),
    averageSolvingTimeSeconds: Number(avgSolvingTimeSeconds.toFixed(2)),
    passRate: Number(passRate.toFixed(2)),
    itemAnalysis: Array.from(itemStats.entries()).map(
      ([questionId, stats]) => ({
        questionId,
        correctRate: stats.total
          ? Number(((stats.correct / stats.total) * 100).toFixed(2))
          : 0,
        attempts: stats.total,
      }),
    ),
  };
};

export const exportExamResultsToExcel = async (
  id: string,
  filters?: { from?: Date; to?: Date; status?: string },
) => {
  ensureValidObjectId(id, "exam id");

  const exam = await Exam.findById(id);
  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const query: Record<string, unknown> = { examId: exam._id };
  if (filters?.status) {
    query.status = filters.status;
  }
  if (filters?.from || filters?.to) {
    query.createdAt = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    };
  }

  const attempts = await Attempt.find(query).populate(
    "studentId",
    "fullName email",
  );

  const rows = mapAttemptsForResultRows(exam.title, attempts).map((row) => ({
    studentName: row.studentName,
    studentEmail: row.studentEmail,
    examTitle: row.examTitle,
    formNumber: row.formNumber,
    status: row.status,
    score: row.score,
    totalQuestions: row.totalQuestions,
    solvingTimeSeconds: row.solvingTimeSeconds,
    startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : "",
    submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : "",
  }));

  const fileBuffer = buildResultsWorkbookBuffer(rows);

  return {
    fileBuffer,
    filename: `exam-${exam._id}-results.xlsx`,
  };
};

const timerOverrideKey = (attemptId: string) =>
  `attempt:timer:override:${attemptId}`;
const timerStartKey = (attemptId: string) => `attempt:timer:${attemptId}`;

const getTimerEndTimestamp = async (
  attemptId: string,
  baseStartTs: number,
  baseDurationSeconds: number,
) => {
  const overrideEnd = await redisClient.get(timerOverrideKey(attemptId));
  if (overrideEnd) {
    return Number(overrideEnd);
  }
  return baseStartTs + baseDurationSeconds * 1000;
};

export const updateAttemptTimerByTeacher = async (input: {
  examId: string;
  attemptId: string;
  extraSeconds?: number;
  remainingSeconds?: number;
}) => {
  ensureValidObjectId(input.examId, "exam id");
  ensureValidObjectId(input.attemptId, "attempt id");

  const exam = await Exam.findById(input.examId);
  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const attempt = await Attempt.findOne({
    _id: input.attemptId,
    examId: input.examId,
  });
  if (!attempt) {
    const error = new Error("Attempt not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const startFromRedis = await redisClient.get(
    timerStartKey(attempt._id.toString()),
  );
  const startTs = startFromRedis
    ? Number(startFromRedis)
    : attempt.startedAt.getTime();
  const now = Date.now();
  const currentEnd = await getTimerEndTimestamp(
    attempt._id.toString(),
    startTs,
    exam.durationSeconds || 3600,
  );

  let newEndTs = currentEnd;
  if (input.remainingSeconds) {
    newEndTs = now + input.remainingSeconds * 1000;
  } else if (input.extraSeconds) {
    newEndTs = currentEnd + input.extraSeconds * 1000;
  }

  await redisClient.set(
    timerOverrideKey(attempt._id.toString()),
    String(newEndTs),
    { EX: 60 * 60 * 24 },
  );

  return {
    attemptId: attempt._id,
    examId: exam._id,
    newRemainingSeconds: Math.max(0, Math.floor((newEndTs - now) / 1000)),
  };
};
