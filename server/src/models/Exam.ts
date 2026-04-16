import mongoose, { Document, Schema } from "mongoose";

export interface IFormOption {
  optionId: string;
  text: string;
}

export interface IFormQuestion {
  questionId: string;
  text: string;
  imageUrl?: string;
  options: IFormOption[];
  correctOptionId: string;
}

export interface IExamForm {
  formNumber: number;
  questions: IFormQuestion[];
}

export interface IExam extends Document {
  title: string;
  description?: string;
  questionIds: mongoose.Types.ObjectId[];
  forms: IExamForm[];
  isPublished: boolean;
  startsAt?: Date;
  endsAt?: Date;
  durationSeconds: number;
  allowLateSubmission: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const formOptionSchema = new Schema<IFormOption>(
  {
    optionId: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false },
);

const formQuestionSchema = new Schema<IFormQuestion>(
  {
    questionId: { type: String, required: true },
    text: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    options: { type: [formOptionSchema], required: true },
    correctOptionId: { type: String, required: true },
  },
  { _id: false },
);

const examFormSchema = new Schema<IExamForm>(
  {
    formNumber: { type: Number, required: true },
    questions: { type: [formQuestionSchema], required: true },
  },
  { _id: false },
);

const examSchema = new Schema<IExam>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    questionIds: [
      { type: Schema.Types.ObjectId, ref: "Question", required: true },
    ],
    forms: {
      type: [examFormSchema],
      validate: {
        validator(forms: IExamForm[]) {
          return Array.isArray(forms) && forms.length === 4;
        },
        message: "Exam must contain exactly 4 forms.",
      },
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    startsAt: {
      type: Date,
    },
    endsAt: {
      type: Date,
    },
    durationSeconds: {
      type: Number,
      default: 3600,
      min: 60,
    },
    allowLateSubmission: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const Exam = mongoose.model<IExam>("Exam", examSchema);

export default Exam;
