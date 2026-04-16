import { asRecord, asString, toId, toIsoDate } from "./helpers";

export interface AttemptListItemDto {
  id: string;
  examId: string;
  examTitle?: string;
  formNumber: number;
  status: "started" | "submitted";
  startedAt: string;
  submittedAt?: string;
  score?: number;
  totalQuestions?: number;
  solvingTimeSeconds?: number;
  createdAt?: string;
}

type AttemptLike = {
  _id: unknown;
  examId: unknown;
  formNumber: number;
  status: "started" | "submitted";
  startedAt: Date | string;
  submittedAt?: Date | string;
  score?: number;
  totalQuestions?: number;
  solvingTimeSeconds?: number;
  createdAt?: Date | string;
};

export const toAttemptListItemDto = (
  attempt: AttemptLike,
): AttemptListItemDto => {
  const exam = asRecord(attempt.examId);

  return {
    id: toId(attempt._id),
    examId: toId(attempt.examId),
    examTitle: exam ? asString(exam.title) : undefined,
    formNumber: attempt.formNumber,
    status: attempt.status,
    startedAt: toIsoDate(attempt.startedAt) || new Date().toISOString(),
    submittedAt: toIsoDate(attempt.submittedAt),
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    solvingTimeSeconds: attempt.solvingTimeSeconds,
    createdAt: toIsoDate(attempt.createdAt),
  };
};
