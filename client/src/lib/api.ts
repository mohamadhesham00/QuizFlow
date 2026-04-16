import axios from "axios";
import { getToken } from "./auth";
import type {
  AttemptPayload,
  AttemptQuestion,
  AttemptStatePayload,
  AttemptSummary,
  AttemptTimerPayload,
  AuthResponse,
  BasicMessageResponse,
  CreateExamRequest,
  Exam,
  LoginRequest,
  PaginatedQuestionsResponse,
  Question,
  QuestionCreateRequest,
  StudentAnswerInput,
  StudentExamItem,
  SubmitAttemptRequest,
  SubmitAttemptResponse,
  UpdateExamRequest,
} from "../types/api";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

export const api = axios.create({
  baseURL,
});

function getStringField(
  source: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  if (!source) {
    return undefined;
  }

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function unwrapObject<T>(value: unknown, fallbackKeys: string[]): T {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const key of fallbackKeys) {
      const candidate = record[key];
      if (
        candidate &&
        typeof candidate === "object" &&
        !Array.isArray(candidate)
      ) {
        return candidate as T;
      }
    }
    return value as T;
  }

  return {} as T;
}

function toArray<T>(value: unknown, fallbackKeys: string[]): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of fallbackKeys) {
      const candidate = record[key];
      if (Array.isArray(candidate)) {
        return candidate as T[];
      }
    }
  }

  return [];
}

function normalizeAttemptStatus(status: unknown): "in_progress" | "submitted" {
  if (typeof status !== "string") {
    return "in_progress";
  }

  const normalized = status.trim().toLowerCase().replace(/[-\s]/g, "_");
  if (normalized === "submitted" || normalized === "completed") {
    return "submitted";
  }

  return "in_progress";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function normalizeAttemptQuestion(raw: unknown): AttemptQuestion | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }

  const questionId = getStringField(record, ["questionId", "_id", "id"]);
  const text = getStringField(record, ["text", "question", "prompt"]);
  const imageUrl = getStringField(record, ["imageUrl", "image", "image_url"]);

  const rawOptions =
    (Array.isArray(record.options) && record.options) ||
    (Array.isArray(record.choices) && record.choices) ||
    (Array.isArray(record.answers) && record.answers) ||
    [];

  const options = rawOptions
    .map((option) => {
      const optionRecord = asRecord(option);
      if (!optionRecord) {
        return null;
      }

      const optionId = getStringField(optionRecord, [
        "optionId",
        "id",
        "key",
        "label",
      ]);
      const optionText = getStringField(optionRecord, [
        "text",
        "value",
        "label",
      ]);

      if (!optionId || !optionText) {
        return null;
      }

      return { optionId, text: optionText };
    })
    .filter((option): option is { optionId: string; text: string } =>
      Boolean(option),
    );

  if (!questionId || !text) {
    return null;
  }

  return {
    questionId,
    text,
    ...(imageUrl ? { imageUrl } : {}),
    options,
  };
}

function normalizeExamRecord(raw: unknown): Exam | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }

  const examId = getStringField(record, ["_id", "id", "examId"]);
  const title = getStringField(record, ["title"]);

  if (!examId || !title) {
    return null;
  }

  return {
    _id: examId,
    title,
    description: getStringField(record, ["description"]),
    published:
      typeof record.published === "boolean" ? record.published : undefined,
    isPublished:
      typeof record.isPublished === "boolean" ? record.isPublished : undefined,
    examCode: getStringField(record, ["examCode"]),
    accessCode: getStringField(record, ["accessCode"]),
    publicExamId: getStringField(record, ["publicExamId"]),
    startsAt: getStringField(record, ["startsAt", "starts_at"]),
    endsAt: getStringField(record, ["endsAt", "ends_at"]),
    durationSeconds:
      typeof record.durationSeconds === "number"
        ? record.durationSeconds
        : undefined,
    allowLateSubmission:
      typeof record.allowLateSubmission === "boolean"
        ? record.allowLateSubmission
        : undefined,
  };
}

function normalizeExamList(value: unknown): Exam[] {
  return toArray<unknown>(value, ["exams", "items", "docs", "results", "data"])
    .map((exam) => normalizeExamRecord(exam))
    .filter((exam): exam is Exam => exam !== null);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/login", payload);
  return data;
}

export async function logoutSession(): Promise<BasicMessageResponse> {
  const { data } = await api.post<BasicMessageResponse>("/api/auth/logout");
  return data;
}

export async function listQuestions(): Promise<Question[]> {
  const { data } = await api.get<unknown>("/api/questions");
  return toArray<Question>(data, [
    "questions",
    "items",
    "docs",
    "results",
    "data",
  ]);
}

export async function listQuestionsPaginated(query: {
  page?: number;
  limit?: number;
  search?: string;
  subject?: string;
  difficulty?: "easy" | "medium" | "hard";
}): Promise<PaginatedQuestionsResponse> {
  const { data } = await api.get<unknown>("/api/questions", {
    params: query,
  });

  const record = asRecord(data) || {};
  const items = toArray<Question>(data, [
    "items",
    "questions",
    "docs",
    "results",
    "data",
  ]);
  const paginationRaw = asRecord(record.pagination);

  return {
    items,
    pagination: {
      page: Number(paginationRaw?.page ?? query.page ?? 1) || 1,
      limit: Number(paginationRaw?.limit ?? query.limit ?? 20) || 20,
      total: Number(paginationRaw?.total ?? items.length) || items.length,
      totalPages:
        Number(
          paginationRaw?.totalPages ??
            Math.max(
              1,
              Math.ceil(
                (Number(paginationRaw?.total ?? items.length) || items.length) /
                  (Number(paginationRaw?.limit ?? query.limit ?? 20) || 20),
              ),
            ),
        ) || 1,
    },
  };
}

export async function createQuestion(
  payload: QuestionCreateRequest,
): Promise<Question> {
  const { data } = await api.post<Question>("/api/questions", payload);
  return data;
}

export async function getQuestionById(questionId: string): Promise<Question> {
  const { data } = await api.get<Question>(`/api/questions/${questionId}`);
  return data;
}

export async function updateQuestion(
  questionId: string,
  payload: QuestionCreateRequest,
): Promise<Question> {
  const { data } = await api.patch<Question>(
    `/api/questions/${questionId}`,
    payload,
  );
  return data;
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await api.delete(`/api/questions/${questionId}`);
}

export async function uploadQuestionImage(
  questionId: string,
  image: File,
): Promise<Question> {
  const form = new FormData();
  form.append("image", image);
  const { data } = await api.post<Question>(
    `/api/questions/${questionId}/image`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data;
}

export async function deleteQuestionImage(
  questionId: string,
): Promise<BasicMessageResponse> {
  const { data } = await api.delete<BasicMessageResponse>(
    `/api/questions/${questionId}/image`,
  );
  return data;
}

export async function importQuestions(
  file: File,
): Promise<BasicMessageResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<BasicMessageResponse>(
    "/api/questions/import",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data;
}

export async function importQuestionsJson(
  questions: QuestionCreateRequest[],
): Promise<BasicMessageResponse> {
  const { data } = await api.post<BasicMessageResponse>(
    "/api/questions/import/json",
    { questions },
  );
  return data;
}

export async function listExams(): Promise<Exam[]> {
  const { data } = await api.get<unknown>("/api/exams");
  return normalizeExamList(data);
}

export async function createExam(payload: CreateExamRequest): Promise<Exam> {
  const { data } = await api.post<unknown>("/api/exams", payload);
  const exam = unwrapObject<unknown>(data, ["exam", "data", "item", "result"]);
  return normalizeExamRecord(exam) || normalizeExamRecord(data) || ({} as Exam);
}

export async function getExamById(examId: string): Promise<Exam> {
  const { data } = await api.get<unknown>(`/api/exams/${examId}`);
  const exam = unwrapObject<unknown>(data, ["exam", "data", "item", "result"]);
  return normalizeExamRecord(exam) || normalizeExamRecord(data) || ({} as Exam);
}

export async function updateExam(
  examId: string,
  payload: UpdateExamRequest,
): Promise<Exam> {
  const { data } = await api.patch<unknown>(`/api/exams/${examId}`, payload);
  const exam = unwrapObject<unknown>(data, ["exam", "data", "item", "result"]);
  return normalizeExamRecord(exam) || normalizeExamRecord(data) || ({} as Exam);
}

export async function deleteExam(
  examId: string,
): Promise<BasicMessageResponse> {
  const { data } = await api.delete<BasicMessageResponse>(
    `/api/exams/${examId}`,
  );
  return data;
}

export async function publishExam(examId: string): Promise<Exam> {
  try {
    const { data } = await api.patch<unknown>(`/api/exams/${examId}/publish`);
    const exam = unwrapObject<unknown>(data, [
      "exam",
      "data",
      "item",
      "result",
    ]);
    return (
      normalizeExamRecord(exam) || normalizeExamRecord(data) || ({} as Exam)
    );
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 404 || error.response?.status === 405)
    ) {
      const { data } = await api.post<unknown>(`/api/exams/${examId}/publish`);
      const exam = unwrapObject<unknown>(data, [
        "exam",
        "data",
        "item",
        "result",
      ]);
      return (
        normalizeExamRecord(exam) || normalizeExamRecord(data) || ({} as Exam)
      );
    }
    throw error;
  }
}

export async function unpublishExam(examId: string): Promise<Exam> {
  try {
    const { data } = await api.patch<unknown>(`/api/exams/${examId}/unpublish`);
    const exam = unwrapObject<unknown>(data, [
      "exam",
      "data",
      "item",
      "result",
    ]);
    return (
      normalizeExamRecord(exam) || normalizeExamRecord(data) || ({} as Exam)
    );
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 404 || error.response?.status === 405)
    ) {
      const { data } = await api.post<unknown>(
        `/api/exams/${examId}/unpublish`,
      );
      const exam = unwrapObject<unknown>(data, [
        "exam",
        "data",
        "item",
        "result",
      ]);
      return (
        normalizeExamRecord(exam) || normalizeExamRecord(data) || ({} as Exam)
      );
    }
    throw error;
  }
}

export async function getExamForms(examId: string): Promise<unknown> {
  const { data } = await api.get(`/api/exams/${examId}/forms`);
  return data;
}

export async function getExamResults(examId: string): Promise<unknown> {
  const { data } = await api.get(`/api/exams/${examId}/results`);
  return data;
}

export async function getExamAnalytics(examId: string): Promise<unknown> {
  const { data } = await api.get(`/api/exams/${examId}/analytics`);
  return data;
}

export async function getExamAttemptDetail(
  examId: string,
  attemptId: string,
): Promise<unknown> {
  const { data } = await api.get(`/api/exams/${examId}/attempts/${attemptId}`);
  return data;
}

export async function updateExamAttemptTimer(
  examId: string,
  attemptId: string,
  payload: { durationSeconds?: number; remainingSeconds?: number },
): Promise<BasicMessageResponse> {
  const { data } = await api.patch<BasicMessageResponse>(
    `/api/exams/${examId}/attempts/${attemptId}/timer`,
    payload,
  );
  return data;
}

export async function exportResults(examId: string): Promise<Blob> {
  const { data } = await api.get(`/api/exams/${examId}/export`, {
    responseType: "blob",
  });
  return data;
}

export async function startExam(
  examId: string,
): Promise<{ attemptId: string }> {
  try {
    const { data } = await api.post<unknown>(
      `/api/student/exams/${examId}/start`,
    );
    const direct =
      typeof data === "object" && data
        ? getStringField(data as Record<string, unknown>, [
            "attemptId",
            "attempt_id",
            "id",
          ])
        : undefined;
    if (direct) {
      return { attemptId: direct };
    }

    const nested =
      typeof data === "object" && data
        ? unwrapObject<Record<string, unknown>>(data, [
            "attempt",
            "data",
            "item",
            "result",
          ])
        : undefined;
    const nestedId = getStringField(nested, [
      "attemptId",
      "attempt_id",
      "id",
      "_id",
    ]);
    if (nestedId) {
      return { attemptId: nestedId };
    }
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 404 || error.response?.status === 405)
    ) {
      const fallbacks = [{ examId }, { examCode: examId }, { id: examId }];

      for (const payload of fallbacks) {
        try {
          const { data } = await api.post<unknown>(
            "/api/student/exams/start",
            payload,
          );
          const direct =
            typeof data === "object" && data
              ? getStringField(data as Record<string, unknown>, [
                  "attemptId",
                  "attempt_id",
                  "id",
                ])
              : undefined;
          if (direct) {
            return { attemptId: direct };
          }

          const nested =
            typeof data === "object" && data
              ? unwrapObject<Record<string, unknown>>(data, [
                  "attempt",
                  "data",
                  "item",
                  "result",
                ])
              : undefined;
          const nestedId = getStringField(nested, [
            "attemptId",
            "attempt_id",
            "id",
            "_id",
          ]);
          if (nestedId) {
            return { attemptId: nestedId };
          }
        } catch {
          // continue to next fallback payload
        }
      }
    }
    throw error;
  }

  throw new Error("Start exam response did not include attemptId");
}

export async function listAvailableStudentExams(): Promise<StudentExamItem[]> {
  const { data } = await api.get<unknown>("/api/student/exams");
  return toArray<unknown>(data, ["exams", "items", "docs", "results", "data"])
    .map<StudentExamItem | null>((exam) => {
      const record = asRecord(exam);
      if (!record) {
        return null;
      }

      const examId = getStringField(record, ["_id", "id", "examId"]);
      const title = getStringField(record, ["title"]);
      if (!examId || !title) {
        return null;
      }

      return {
        _id: examId,
        title,
        description: getStringField(record, ["description"]),
        examCode: getStringField(record, ["examCode"]),
        accessCode: getStringField(record, ["accessCode"]),
        publicExamId: getStringField(record, ["publicExamId"]),
        startsAt: getStringField(record, ["startsAt", "starts_at"]),
        endsAt: getStringField(record, ["endsAt", "ends_at"]),
        durationSeconds:
          typeof record.durationSeconds === "number"
            ? record.durationSeconds
            : undefined,
      } as StudentExamItem;
    })
    .filter((exam): exam is StudentExamItem => exam !== null);
}

export async function getAttempt(attemptId: string): Promise<AttemptPayload> {
  const { data } = await api.get<unknown>(`/api/student/attempts/${attemptId}`);
  const attemptContainer = unwrapObject<Record<string, unknown>>(data, [
    "attempt",
    "data",
    "item",
    "result",
  ]);
  const attempt =
    asRecord(attemptContainer.attempt) ||
    asRecord(attemptContainer.data) ||
    attemptContainer;

  const form = asRecord(attempt.form);
  const rawQuestions =
    (Array.isArray(attempt.questions) && attempt.questions) ||
    (Array.isArray(attempt.assignedQuestions) && attempt.assignedQuestions) ||
    (form && Array.isArray(form.questions) ? form.questions : []);

  const normalizedQuestions = rawQuestions
    .map((question) => normalizeAttemptQuestion(question))
    .filter((question): question is AttemptQuestion => question !== null);

  const normalizedAttemptId =
    getStringField(attempt, ["attemptId", "_id", "id"]) || attemptId;

  const normalizedExamId =
    getStringField(attempt, ["examId", "exam", "exam_id"]) || "";

  const rawDuration = attempt.durationSeconds;
  const durationSeconds =
    typeof rawDuration === "number" ? rawDuration : undefined;

  const startedAt = getStringField(attempt, ["startedAt", "started_at"]);
  const formCode =
    getStringField(attempt, ["formCode", "form", "formId"]) ||
    getStringField(form, ["code", "formCode", "name"]);

  return {
    attemptId: normalizedAttemptId,
    examId: normalizedExamId,
    formCode,
    startedAt,
    durationSeconds,
    questions: normalizedQuestions,
  };
}

export async function submitAttempt(
  attemptId: string,
  payload: SubmitAttemptRequest,
): Promise<SubmitAttemptResponse> {
  const { data } = await api.post<unknown>(
    `/api/student/attempts/${attemptId}/submit`,
    payload,
  );
  const submissionContainer = unwrapObject<Record<string, unknown>>(data, [
    "result",
    "submission",
    "data",
    "item",
  ]);
  const submission =
    asRecord(submissionContainer.result) ||
    asRecord(submissionContainer.submission) ||
    asRecord(submissionContainer.data) ||
    submissionContainer;

  return {
    attemptId:
      getStringField(submission, ["attemptId", "_id", "id"]) || attemptId,
    score: Number(submission.score ?? submission.correctAnswers ?? 0) || 0,
    total:
      Number(
        submission.total ??
          submission.totalQuestions ??
          submission.maxScore ??
          0,
      ) || 0,
    percentage: Number(submission.percentage ?? submission.percent ?? 0) || 0,
    solvingTimeSeconds:
      Number(
        submission.solvingTimeSeconds ?? submission.timeSpentSeconds ?? 0,
      ) || 0,
  };
}

export async function saveAttemptAnswers(
  attemptId: string,
  answers: StudentAnswerInput[],
): Promise<BasicMessageResponse> {
  const { data } = await api.patch<BasicMessageResponse>(
    `/api/student/attempts/${attemptId}/answers`,
    {
      answers,
    },
  );
  return data;
}

export async function getAttemptState(
  attemptId: string,
): Promise<AttemptStatePayload> {
  const { data } = await api.get<AttemptStatePayload>(
    `/api/student/attempts/${attemptId}/state`,
  );
  return {
    ...data,
    status: normalizeAttemptStatus(data?.status),
  };
}

export async function getAttemptTimer(
  attemptId: string,
): Promise<AttemptTimerPayload> {
  const { data } = await api.get<AttemptTimerPayload>(
    `/api/student/attempts/${attemptId}/timer`,
  );
  return data;
}

export async function sendAttemptHeartbeat(
  attemptId: string,
): Promise<BasicMessageResponse> {
  const { data } = await api.post<BasicMessageResponse>(
    `/api/student/attempts/${attemptId}/heartbeat`,
  );
  return data;
}

export async function getAttemptResult(
  attemptId: string,
): Promise<SubmitAttemptResponse> {
  const { data } = await api.get<unknown>(
    `/api/student/attempts/${attemptId}/result`,
  );
  const submissionContainer = unwrapObject<Record<string, unknown>>(data, [
    "result",
    "submission",
    "data",
    "item",
  ]);
  const submission =
    asRecord(submissionContainer.result) ||
    asRecord(submissionContainer.submission) ||
    asRecord(submissionContainer.data) ||
    submissionContainer;

  return {
    attemptId:
      getStringField(submission, ["attemptId", "_id", "id"]) || attemptId,
    score: Number(submission.score ?? submission.correctAnswers ?? 0) || 0,
    total:
      Number(
        submission.total ??
          submission.totalQuestions ??
          submission.maxScore ??
          0,
      ) || 0,
    percentage: Number(submission.percentage ?? submission.percent ?? 0) || 0,
    solvingTimeSeconds:
      Number(
        submission.solvingTimeSeconds ?? submission.timeSpentSeconds ?? 0,
      ) || 0,
  };
}

export async function listStudentAttempts(): Promise<AttemptSummary[]> {
  const { data } = await api.get<unknown>("/api/student/attempts");
  const attempts = toArray<Record<string, unknown>>(data, [
    "attempts",
    "items",
    "docs",
    "results",
    "data",
  ]);

  return attempts.map((attemptItem) => {
    const attempt =
      asRecord(attemptItem.attempt) ||
      asRecord(attemptItem.data) ||
      asRecord(attemptItem.result) ||
      attemptItem;

    return {
      _id:
        getStringField(attempt, ["_id", "attemptId", "id"]) ||
        crypto.randomUUID(),
      examId: getStringField(attempt, ["examId", "exam", "exam_id"]) || "",
      examTitle: getStringField(attempt, ["examTitle", "title", "examName"]),
      status: normalizeAttemptStatus(attempt.status),
      startedAt:
        getStringField(attempt, ["startedAt", "createdAt", "started_at"]) ||
        new Date().toISOString(),
      submittedAt: getStringField(attempt, ["submittedAt", "submitted_at"]),
      score:
        typeof attempt.score === "number"
          ? attempt.score
          : typeof attempt.correctAnswers === "number"
            ? attempt.correctAnswers
            : undefined,
      percentage:
        typeof attempt.percentage === "number"
          ? attempt.percentage
          : typeof attempt.percent === "number"
            ? attempt.percent
            : undefined,
    };
  });
}

export async function pingHealth(): Promise<{ message?: string } | string> {
  const { data } = await api.get<{ message?: string } | string>("/");
  return data;
}
