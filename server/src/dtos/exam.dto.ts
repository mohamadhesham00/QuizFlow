import {
  asBoolean,
  asNumber,
  asRecord,
  asString,
  toId,
  toIsoDate,
} from "./helpers";
import {
  toQuestionBriefDto,
  toQuestionIds,
  type QuestionBriefDto,
} from "./question.dto";
import { toUserSummaryDto, type UserSummaryDto } from "./user.dto";

export interface ExamFormOptionDto {
  optionId: string;
  text: string;
}

export interface ExamFormQuestionDto {
  questionId: string;
  text: string;
  imageUrl?: string;
  options: ExamFormOptionDto[];
  correctOptionId?: string;
}

export interface ExamFormDto {
  formNumber: number;
  questions: ExamFormQuestionDto[];
}

export interface ExamDto {
  id: string;
  title: string;
  description?: string;
  questionIds: string[];
  questions?: QuestionBriefDto[];
  forms: ExamFormDto[];
  isPublished: boolean;
  startsAt?: string;
  endsAt?: string;
  durationSeconds: number;
  allowLateSubmission: boolean;
  createdBy?: UserSummaryDto;
  createdAt?: string;
  updatedAt?: string;
}

type ExamLike = {
  _id: unknown;
  title: string;
  description?: string;
  questionIds?: unknown[];
  forms?: Array<{
    formNumber: number;
    questions: Array<{
      questionId: string;
      text: string;
      imageUrl?: string;
      options: Array<{ optionId: string; text: string }>;
      correctOptionId?: string;
    }>;
  }>;
  isPublished?: boolean;
  startsAt?: Date | string;
  endsAt?: Date | string;
  durationSeconds?: number;
  allowLateSubmission?: boolean;
  createdBy?: unknown;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export const toExamDto = (exam: ExamLike): ExamDto => {
  const questions = (exam.questionIds || [])
    .map((entry) => toQuestionBriefDto(entry))
    .filter((entry): entry is QuestionBriefDto => entry !== null);

  return {
    id: toId(exam._id),
    title: exam.title,
    description: exam.description,
    questionIds: toQuestionIds(exam.questionIds),
    questions: questions.length ? questions : undefined,
    forms: (exam.forms || []).map((form) => ({
      formNumber: form.formNumber,
      questions: (form.questions || []).map((question) => ({
        questionId: question.questionId,
        text: question.text,
        imageUrl: question.imageUrl,
        options: (question.options || []).map((option) => ({
          optionId: option.optionId,
          text: option.text,
        })),
        correctOptionId: question.correctOptionId,
      })),
    })),
    isPublished: Boolean(exam.isPublished),
    startsAt: toIsoDate(exam.startsAt),
    endsAt: toIsoDate(exam.endsAt),
    durationSeconds: exam.durationSeconds || 3600,
    allowLateSubmission: Boolean(exam.allowLateSubmission),
    createdBy: toUserSummaryDto(exam.createdBy) || undefined,
    createdAt: toIsoDate(exam.createdAt),
    updatedAt: toIsoDate(exam.updatedAt),
  };
};

export interface ExamListItemDto {
  id: string;
  title: string;
  description?: string;
  isPublished: boolean;
  startsAt?: string;
  endsAt?: string;
  durationSeconds: number;
  allowLateSubmission: boolean;
  questionCount: number;
  createdBy?: UserSummaryDto;
  createdAt?: string;
}

export const toExamListItemDto = (value: unknown): ExamListItemDto | null => {
  const exam = asRecord(value);
  if (!exam) {
    return null;
  }

  const id = toId(exam);
  const title = asString(exam.title);
  if (!id || !title) {
    return null;
  }

  const questionIds = Array.isArray(exam.questionIds) ? exam.questionIds : [];

  return {
    id,
    title,
    description: asString(exam.description),
    isPublished: asBoolean(exam.isPublished) || false,
    startsAt: toIsoDate(exam.startsAt),
    endsAt: toIsoDate(exam.endsAt),
    durationSeconds: asNumber(exam.durationSeconds) || 3600,
    allowLateSubmission: asBoolean(exam.allowLateSubmission) || false,
    questionCount: questionIds.length,
    createdBy: toUserSummaryDto(exam.createdBy) || undefined,
    createdAt: toIsoDate(exam.createdAt),
  };
};
