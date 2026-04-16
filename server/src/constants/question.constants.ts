export const QUESTION_SUBJECTS = [
  "Databases",
  "Backend",
  "Frontend",
  "DevOps",
  "Basics",
] as const;

export type QuestionSubject = (typeof QUESTION_SUBJECTS)[number];

export const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export const isQuestionSubject = (value: unknown): value is QuestionSubject => {
  return (
    typeof value === "string" &&
    QUESTION_SUBJECTS.includes(value as QuestionSubject)
  );
};

export const isQuestionDifficulty = (
  value: unknown,
): value is QuestionDifficulty => {
  return (
    typeof value === "string" &&
    QUESTION_DIFFICULTIES.includes(value as QuestionDifficulty)
  );
};

export const toQuestionSubject = (
  value: unknown,
): QuestionSubject | undefined => {
  return isQuestionSubject(value) ? value : undefined;
};

export const toQuestionDifficulty = (
  value: unknown,
): QuestionDifficulty | undefined => {
  return isQuestionDifficulty(value) ? value : undefined;
};
