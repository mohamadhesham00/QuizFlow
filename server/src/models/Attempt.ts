import mongoose, { Document, Schema } from "mongoose";

export type AttemptStatus = "started" | "submitted";

export interface IAnswer {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
}

export interface IDraftAnswer {
  questionId: string;
  selectedOptionId: string;
}

export interface IAttempt extends Document {
  examId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  formNumber: number;
  status: AttemptStatus;
  startedAt: Date;
  submittedAt?: Date;
  solvingTimeSeconds?: number;
  score?: number;
  totalQuestions?: number;
  answers: IAnswer[];
  draftAnswers: IDraftAnswer[];
}

const answerSchema = new Schema<IAnswer>(
  {
    questionId: { type: String, required: true },
    selectedOptionId: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
  },
  { _id: false },
);

const draftAnswerSchema = new Schema<IDraftAnswer>(
  {
    questionId: { type: String, required: true },
    selectedOptionId: { type: String, required: true },
  },
  { _id: false },
);

const attemptSchema = new Schema<IAttempt>(
  {
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    formNumber: { type: Number, required: true },
    status: {
      type: String,
      enum: ["started", "submitted"],
      default: "started",
    },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date },
    solvingTimeSeconds: { type: Number },
    score: { type: Number },
    totalQuestions: { type: Number },
    answers: { type: [answerSchema], default: [] },
    draftAnswers: { type: [draftAnswerSchema], default: [] },
  },
  { timestamps: true },
);

attemptSchema.index(
  { examId: 1, studentId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "started" },
  },
);

const Attempt = mongoose.model<IAttempt>("Attempt", attemptSchema);

export default Attempt;
