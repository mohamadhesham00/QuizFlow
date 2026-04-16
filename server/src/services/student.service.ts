import Attempt from "../models/Attempt";
import Exam from "../models/Exam";
import { redisClient } from "../config/redis";
import type { IAttempt } from "../models/Attempt";
import type { IExam } from "../models/Exam";
import { toExamListItemDto } from "../dtos/exam.dto";
import { toAttemptListItemDto } from "../dtos/attempt.dto";

const timerKey = (attemptId: string): string => `attempt:timer:${attemptId}`;
const timerOverrideKey = (attemptId: string): string =>
  `attempt:timer:override:${attemptId}`;

const ensureStudent = (studentId?: string) => {
  if (!studentId) {
    const error = new Error("Unauthorized");
    (error as Error & { statusCode?: number }).statusCode = 401;
    throw error;
  }
};

const ensureExamAvailableForStart = (exam: IExam | null) => {
  const now = new Date();
  if (!exam || !exam.isPublished) {
    const error = new Error("Exam not found or not published");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  if (exam.startsAt && now < exam.startsAt) {
    const error = new Error("Exam has not started yet");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  if (exam.endsAt && now > exam.endsAt && !exam.allowLateSubmission) {
    const error = new Error("Exam has ended");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
};

const resolveAttemptTimer = async (
  attempt: IAttempt | null,
  examDurationSeconds: number,
) => {
  if (!attempt) {
    return {
      startedAtMs: Date.now(),
      remainingSeconds: 0,
      endAtMs: Date.now(),
    };
  }

  const startedTimeFromRedis = await redisClient.get(
    timerKey(attempt._id.toString()),
  );
  const startedAtMs = startedTimeFromRedis
    ? Number(startedTimeFromRedis)
    : attempt.startedAt.getTime();
  const overrideEndRaw = await redisClient.get(
    timerOverrideKey(attempt._id.toString()),
  );
  const endAtMs = overrideEndRaw
    ? Number(overrideEndRaw)
    : startedAtMs + (examDurationSeconds || 3600) * 1000;
  const remainingSeconds = Math.max(
    0,
    Math.floor((endAtMs - Date.now()) / 1000),
  );

  return { startedAtMs, remainingSeconds, endAtMs };
};

export const getAvailableStudentExams = async (studentId?: string) => {
  ensureStudent(studentId);
  const now = new Date();
  const exams = await Exam.find({
    isPublished: true,
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
      {
        $or: [
          { endsAt: { $exists: false } },
          { endsAt: { $gte: now } },
          { allowLateSubmission: true },
        ],
      },
    ],
  })
    .populate({ path: "createdBy", select: "fullName email role" })
    .populate({
      path: "questionIds",
      select: "text subject difficulty points estimatedTimeSeconds",
    })
    .sort({ createdAt: -1 });

  return exams
    .map((exam) => toExamListItemDto(exam.toObject()))
    .filter((exam): exam is NonNullable<typeof exam> => exam !== null);
};

export const startStudentExam = async (input: {
  examId: string;
  studentId?: string;
}) => {
  ensureStudent(input.studentId);

  const exam = await Exam.findById(input.examId);
  ensureExamAvailableForStart(exam);

  const existingOpenAttempt = await Attempt.findOne({
    examId: input.examId,
    studentId: input.studentId,
    status: "started",
  });

  if (existingOpenAttempt) {
    return {
      attemptId: existingOpenAttempt._id,
      formNumber: existingOpenAttempt.formNumber,
      created: false,
    };
  }

  const formNumber = Math.floor(Math.random() * 4) + 1;
  const attempt = new Attempt({
    examId: input.examId,
    studentId: input.studentId,
    formNumber,
    status: "started",
    startedAt: new Date(),
    answers: [],
    draftAnswers: [],
  });

  try {
    await attempt.save();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      const current = await Attempt.findOne({
        examId: input.examId,
        studentId: input.studentId,
        status: "started",
      });
      if (current) {
        return {
          attemptId: current._id,
          formNumber: current.formNumber,
          created: false,
        };
      }
    }
    throw error;
  }

  const examDuration = exam?.durationSeconds || 3600;
  await redisClient.set(
    timerKey(attempt._id.toString()),
    Date.now().toString(),
    {
      EX: Math.max(3600, examDuration + 3600),
    },
  );

  return {
    attemptId: attempt._id,
    formNumber,
    created: true,
  };
};

export const getStudentAttemptQuestions = async (input: {
  attemptId: string;
  studentId?: string;
}) => {
  ensureStudent(input.studentId);

  const attempt = await Attempt.findById(input.attemptId);
  if (!attempt) {
    const error = new Error("Attempt not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  if (attempt.studentId.toString() !== input.studentId) {
    const error = new Error("Forbidden");
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }

  const exam = await Exam.findById(attempt.examId);
  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const form = exam.forms.find(
    (entry) => entry.formNumber === attempt.formNumber,
  );
  if (!form) {
    const error = new Error("Form not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  return {
    attemptId: attempt._id,
    examId: exam._id,
    title: exam.title,
    formNumber: attempt.formNumber,
    questions: form.questions.map((question) => ({
      questionId: question.questionId,
      text: question.text,
      imageUrl: question.imageUrl,
      options: question.options,
    })),
  };
};

export const submitStudentAttempt = async (input: {
  attemptId: string;
  studentId?: string;
  answers: { questionId: string; selectedOptionId: string }[];
}) => {
  ensureStudent(input.studentId);

  const attempt = await Attempt.findById(input.attemptId);
  if (!attempt) {
    const error = new Error("Attempt not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  if (attempt.studentId.toString() !== input.studentId) {
    const error = new Error("Forbidden");
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }

  if (attempt.status === "submitted") {
    const error = new Error("Attempt already submitted");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  const exam = await Exam.findById(attempt.examId);
  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const form = exam.forms.find(
    (entry) => entry.formNumber === attempt.formNumber,
  );
  if (!form) {
    const error = new Error("Form not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const questionMap = new Map(
    form.questions.map((question) => [question.questionId, question]),
  );
  const evaluatedAnswers = input.answers
    .map((answer) => {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        return null;
      }

      return {
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        isCorrect: question.correctOptionId === answer.selectedOptionId,
      };
    })
    .filter(
      (
        answer,
      ): answer is {
        questionId: string;
        selectedOptionId: string;
        isCorrect: boolean;
      } => answer !== null,
    );

  const score = evaluatedAnswers.filter((answer) => answer.isCorrect).length;
  const timerInfo = await resolveAttemptTimer(
    attempt,
    exam.durationSeconds || 3600,
  );
  const submittedAt = new Date();
  const solvingTimeSeconds = Math.max(
    1,
    Math.floor((submittedAt.getTime() - timerInfo.startedAtMs) / 1000),
  );

  attempt.answers = evaluatedAnswers;
  attempt.score = score;
  attempt.totalQuestions = form.questions.length;
  attempt.submittedAt = submittedAt;
  attempt.solvingTimeSeconds = solvingTimeSeconds;
  attempt.status = "submitted";
  attempt.draftAnswers = input.answers;

  await attempt.save();
  await redisClient.del(timerKey(attempt._id.toString()));
  await redisClient.del(timerOverrideKey(attempt._id.toString()));

  return {
    score,
    totalQuestions: form.questions.length,
    solvingTimeSeconds,
    percentage: Number(((score / form.questions.length) * 100).toFixed(2)),
  };
};

export const listStudentAttempts = async (studentId?: string) => {
  ensureStudent(studentId);

  const attempts = await Attempt.find({ studentId })
    .populate("examId", "title")
    .sort({ createdAt: -1 });

  return attempts.map((attempt) => toAttemptListItemDto(attempt.toObject()));
};

export const saveDraftAnswers = async (input: {
  attemptId: string;
  studentId?: string;
  answers: { questionId: string; selectedOptionId: string }[];
}) => {
  ensureStudent(input.studentId);

  const attempt = await Attempt.findById(input.attemptId);
  if (!attempt) {
    const error = new Error("Attempt not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }
  if (attempt.studentId.toString() !== input.studentId) {
    const error = new Error("Forbidden");
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }
  if (attempt.status !== "started") {
    const error = new Error("Cannot save draft for submitted attempt");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  attempt.draftAnswers = input.answers;
  await attempt.save();

  return {
    message: "Draft answers saved",
    attemptId: attempt._id,
    draftCount: input.answers.length,
  };
};

export const getStudentAttemptState = async (input: {
  attemptId: string;
  studentId?: string;
}) => {
  ensureStudent(input.studentId);
  const attempt = await Attempt.findById(input.attemptId);
  if (!attempt) {
    const error = new Error("Attempt not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }
  if (attempt.studentId.toString() !== input.studentId) {
    const error = new Error("Forbidden");
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }

  const exam = await Exam.findById(attempt.examId);
  if (!exam) {
    const error = new Error("Exam not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const timer = await resolveAttemptTimer(
    attempt,
    exam.durationSeconds || 3600,
  );

  return {
    attemptId: attempt._id,
    examId: exam._id,
    status: attempt.status,
    formNumber: attempt.formNumber,
    draftAnswers: attempt.draftAnswers,
    answeredCount: attempt.draftAnswers.length,
    remainingSeconds: timer.remainingSeconds,
  };
};

export const getStudentAttemptTimer = async (input: {
  attemptId: string;
  studentId?: string;
}) => {
  const state = await getStudentAttemptState(input);
  return {
    attemptId: state.attemptId,
    remainingSeconds: state.remainingSeconds,
    status: state.status,
  };
};

export const heartbeatStudentAttempt = async (input: {
  attemptId: string;
  studentId?: string;
}) => {
  const timer = await getStudentAttemptTimer(input);
  if (timer.status === "started") {
    await redisClient.expire(timerKey(String(timer.attemptId)), 60 * 60 * 24);
  }

  return {
    message: "Heartbeat received",
    ...timer,
  };
};

export const getStudentAttemptResult = async (input: {
  attemptId: string;
  studentId?: string;
}) => {
  ensureStudent(input.studentId);
  const attempt = await Attempt.findById(input.attemptId);
  if (!attempt) {
    const error = new Error("Attempt not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }
  if (attempt.studentId.toString() !== input.studentId) {
    const error = new Error("Forbidden");
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }
  if (attempt.status !== "submitted") {
    const error = new Error("Attempt is not submitted yet");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  const exam = await Exam.findById(attempt.examId);
  const form = exam?.forms.find(
    (entry) => entry.formNumber === attempt.formNumber,
  );

  return {
    attemptId: attempt._id,
    examId: attempt.examId,
    score: attempt.score || 0,
    totalQuestions: attempt.totalQuestions || 0,
    solvingTimeSeconds: attempt.solvingTimeSeconds || 0,
    percentage:
      attempt.totalQuestions && attempt.totalQuestions > 0
        ? Number(
            (((attempt.score || 0) / attempt.totalQuestions) * 100).toFixed(2),
          )
        : 0,
    answers: attempt.answers,
    questions:
      form?.questions.map((q) => ({
        questionId: q.questionId,
        text: q.text,
        imageUrl: q.imageUrl,
        options: q.options,
      })) || [],
  };
};
