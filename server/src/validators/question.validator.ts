import { z } from "zod";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_SUBJECTS,
} from "../constants/question.constants";

const optionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const metadataSchema = {
  subject: z.enum(QUESTION_SUBJECTS).optional(),
  difficulty: z.enum(QUESTION_DIFFICULTIES).optional(),
  tags: z.array(z.string().min(1)).optional(),
  estimatedTimeSeconds: z.number().int().min(5).optional(),
  points: z.number().int().min(1).optional(),
};

export const createQuestionSchema = z
  .object({
    text: z.string().min(5),
    options: z.array(optionSchema).min(2),
    ...metadataSchema,
  })
  .refine((data) => data.options.filter((opt) => opt.isCorrect).length === 1, {
    message: "Exactly one option must be correct",
    path: ["options"],
  });

export const updateQuestionSchema = z
  .object({
    text: z.string().min(5).optional(),
    imageUrl: z.string().url().optional(),
    options: z.array(optionSchema).min(2).optional(),
    ...metadataSchema,
  })
  .refine(
    (data) => {
      if (!data.options) {
        return true;
      }
      return data.options.filter((opt) => opt.isCorrect).length === 1;
    },
    {
      message: "Exactly one option must be correct",
      path: ["options"],
    },
  );
