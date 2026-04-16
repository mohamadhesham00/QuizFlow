export type UserRole = "teacher" | "student";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface Option {
  optionId: string;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  _id: string;
  text: string;
  subject?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  estimatedTimeSeconds?: number;
  points?: number;
  imageUrl?: string;
  options: Option[];
}

export interface QuestionOptionInput {
  text: string;
  isCorrect: boolean;
}

export interface QuestionCreateRequest {
  text: string;
  subject?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  estimatedTimeSeconds?: number;
  points?: number;
  options: QuestionOptionInput[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedQuestionsResponse {
  items: Question[];
  pagination: PaginationMeta;
}

export interface Exam {
  _id: string;
  title: string;
  description?: string;
  published?: boolean;
  isPublished?: boolean;
  examCode?: string;
  accessCode?: string;
  publicExamId?: string;
  startsAt?: string;
  endsAt?: string;
  durationSeconds?: number;
  allowLateSubmission?: boolean;
}

export interface CreateExamRequest {
  title: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  durationSeconds?: number;
  allowLateSubmission?: boolean;
  questionIds: string[];
}

export interface UpdateExamRequest {
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  durationSeconds?: number;
  allowLateSubmission?: boolean;
  questionIds?: string[];
}

export interface AttemptQuestion {
  questionId: string;
  text: string;
  imageUrl?: string;
  options: Array<{ optionId: string; text: string }>;
}

export interface AttemptPayload {
  attemptId: string;
  examId: string;
  formCode?: string;
  startedAt?: string;
  durationSeconds?: number;
  questions: AttemptQuestion[];
}

export interface StudentAnswerInput {
  questionId: string;
  selectedOptionId: string;
}

export interface SubmitAttemptRequest {
  answers: StudentAnswerInput[];
}

export interface SubmitAttemptResponse {
  attemptId: string;
  score: number;
  total: number;
  percentage: number;
  solvingTimeSeconds: number;
}

export interface AttemptSummary {
  _id: string;
  examId: string;
  examTitle?: string;
  status: "in_progress" | "submitted";
  startedAt: string;
  submittedAt?: string;
  score?: number;
  percentage?: number;
}

export interface StudentExamItem {
  _id: string;
  title: string;
  description?: string;
  examCode?: string;
  accessCode?: string;
  publicExamId?: string;
  startsAt?: string;
  endsAt?: string;
  durationSeconds?: number;
}

export interface AttemptTimerPayload {
  attemptId: string;
  remainingSeconds: number;
}

export interface AttemptStatePayload {
  attemptId: string;
  status: "in_progress" | "submitted";
  currentQuestionIndex?: number;
}

export interface BasicMessageResponse {
  message?: string;
}
