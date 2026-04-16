import type {
  QuestionDifficulty,
  QuestionSubject,
} from "../../constants/question.constants";

export type QuestionListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  subject?: QuestionSubject;
  difficulty?: QuestionDifficulty;
  tag?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

const QUESTION_FILTER_BUILDERS = {
  search: (value: string) => ({
    text: { $regex: value, $options: "i" },
  }),
  subject: (value: QuestionSubject) => ({
    subject: value,
  }),
  difficulty: (value: QuestionDifficulty) => ({
    difficulty: value,
  }),
  tag: (value: string) => ({
    tags: value,
  }),
} as const;

const QUESTION_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "difficulty",
  "points",
  "estimatedTimeSeconds",
] as const;

type QuestionFilterBuilderKey = keyof typeof QUESTION_FILTER_BUILDERS;

const FILTER_ENTRIES = (
  query: QuestionListQuery,
): Array<
  [QuestionFilterBuilderKey, QuestionListQuery[QuestionFilterBuilderKey]]
> => {
  return [
    ["search", query.search],
    ["subject", query.subject],
    ["difficulty", query.difficulty],
    ["tag", query.tag],
  ];
};

export const buildQuestionFilter = (
  query: QuestionListQuery,
): Record<string, unknown> => {
  const filter: Record<string, unknown> = {};

  for (const [key, value] of FILTER_ENTRIES(query)) {
    if (!value) {
      continue;
    }

    Object.assign(filter, QUESTION_FILTER_BUILDERS[key](value as never));
  }

  return filter;
};

export const resolveQuestionSort = (query: QuestionListQuery) => {
  const sortBy = QUESTION_SORT_FIELDS.includes(
    (query.sortBy || "") as (typeof QUESTION_SORT_FIELDS)[number],
  )
    ? (query.sortBy as (typeof QUESTION_SORT_FIELDS)[number])
    : "createdAt";

  const sortOrder: 1 | -1 = query.sortOrder === "asc" ? 1 : -1;

  return { sortBy, sortOrder };
};
