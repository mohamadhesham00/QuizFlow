import mongoose, { Document, Schema } from "mongoose";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_SUBJECTS,
  type QuestionDifficulty,
  type QuestionSubject,
} from "../constants/question.constants";

export interface IQuestionOption {
  optionId: string;
  text: string;
  isCorrect: boolean;
}

export interface IQuestion extends Document {
  text: string;
  imageUrl?: string;
  options: IQuestionOption[];
  subject?: QuestionSubject;
  difficulty?: QuestionDifficulty;
  tags: string[];
  estimatedTimeSeconds: number;
  points: number;
  createdBy: mongoose.Types.ObjectId;
}

const questionOptionSchema = new Schema<IQuestionOption>(
  {
    optionId: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    isCorrect: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const questionSchema = new Schema<IQuestion>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    options: {
      type: [questionOptionSchema],
      validate: {
        validator(value: IQuestionOption[]) {
          if (!Array.isArray(value) || value.length < 2) {
            return false;
          }
          const correct = value.filter((item) => item.isCorrect);
          return correct.length === 1;
        },
        message:
          "Question must have at least 2 options and exactly one correct option.",
      },
      required: true,
    },
    subject: {
      type: String,
      enum: QUESTION_SUBJECTS,
      default: "Basics",
      trim: true,
    },
    difficulty: {
      type: String,
      enum: QUESTION_DIFFICULTIES,
      default: "medium",
    },
    tags: {
      type: [String],
      default: [],
    },
    estimatedTimeSeconds: {
      type: Number,
      default: 60,
      min: 5,
    },
    points: {
      type: Number,
      default: 1,
      min: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const Question = mongoose.model<IQuestion>("Question", questionSchema);

export default Question;
