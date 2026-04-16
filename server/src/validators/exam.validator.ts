import { z } from "zod";

export const createExamSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  questionIds: z.array(z.string().min(1)).min(1),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  durationSeconds: z.number().int().min(60).optional(),
  allowLateSubmission: z.boolean().optional(),
});

export const updateExamSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  questionIds: z.array(z.string().min(1)).min(1).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  durationSeconds: z.number().int().min(60).optional(),
  allowLateSubmission: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export const updateAttemptTimerSchema = z
  .object({
    extraSeconds: z.number().int().min(1).optional(),
    remainingSeconds: z.number().int().min(1).optional(),
  })
  .refine((data) => Boolean(data.extraSeconds || data.remainingSeconds), {
    message: "Either extraSeconds or remainingSeconds is required",
  });
