import { randomUUID } from "crypto";

export type RawOptionInput = {
  text: string;
  isCorrect: boolean;
};

export const normalizeOptionsForStorage = (options: RawOptionInput[]) =>
  options.map((option) => ({
    optionId: randomUUID(),
    text: option.text.trim(),
    isCorrect: Boolean(option.isCorrect),
  }));
