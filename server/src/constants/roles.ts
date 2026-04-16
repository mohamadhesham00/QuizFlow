export const ROLES = {
  TEACHER: "teacher",
  STUDENT: "student",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
