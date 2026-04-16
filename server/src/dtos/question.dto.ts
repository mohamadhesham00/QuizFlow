import type {
  QuestionDifficulty,
  QuestionSubject,
} from "../constants/question.constants";
import {
  asNumber,
  asRecord,
  asString,
  asStringArray,
  toId,
  toIsoDate,
} from "./helpers";
import { toUserSummaryDto, type UserSummaryDto } from "./user.dto";

export interface QuestionOptionDto {
  optionId: string;
  text: string;
}

export interface QuestionDto {
  id: string;
  text: string;
  imageUrl?: string;
  options: QuestionOptionDto[];
  subject?: QuestionSubject;
  difficulty?: QuestionDifficulty;
  tags: string[];
  estimatedTimeSeconds: number;
  points: number;
  createdBy?: UserSummaryDto;
  createdAt?: string;
  updatedAt?: string;
}

type QuestionLike = {
  _id: unknown;
  text: string;
  imageUrl?: string;
  options?: Array<{ optionId: string; text: string }>;
  subject?: QuestionSubject;
  difficulty?: QuestionDifficulty;
  tags?: string[];
  estimatedTimeSeconds?: number;
  points?: number;
  createdBy?: unknown;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export const toQuestionDto = (question: QuestionLike): QuestionDto => ({
  id: toId(question._id),
  text: question.text,
  imageUrl: question.imageUrl,
  options: (question.options || []).map((option) => ({
    optionId: option.optionId,
    text: option.text,
  })),
  subject: question.subject,
  difficulty: question.difficulty,
  tags: question.tags || [],
  estimatedTimeSeconds: question.estimatedTimeSeconds || 60,
  points: question.points || 1,
  createdBy: toUserSummaryDto(question.createdBy) || undefined,
  createdAt: toIsoDate(question.createdAt),
  updatedAt: toIsoDate(question.updatedAt),
});

export interface QuestionBriefDto {
  id: string;
  text: string;
  subject?: QuestionSubject;
  difficulty?: QuestionDifficulty;
  points?: number;
  estimatedTimeSeconds?: number;
}

export const toQuestionBriefDto = (value: unknown): QuestionBriefDto | null => {
  const question = asRecord(value);
  if (!question) {
    return null;
  }

  const id = toId(question);
  const text = asString(question.text);
  if (!id || !text) {
    return null;
  }

  return {
    id,
    text,
    subject: asString(question.subject) as QuestionSubject | undefined,
    difficulty: asString(question.difficulty) as QuestionDifficulty | undefined,
    points: asNumber(question.points),
    estimatedTimeSeconds: asNumber(question.estimatedTimeSeconds),
  };
};

export const toQuestionIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => toId(entry)).filter((entry) => entry.length > 0);
};

export const toQuestionTags = (value: unknown): string[] =>
  asStringArray(value);
