const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasToHexString = (
  value: unknown,
): value is { toHexString: () => string } =>
  isRecord(value) && typeof value.toHexString === "function";

export const toId = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (hasToHexString(value)) {
    return value.toHexString();
  }

  if (isRecord(value) && "_id" in value) {
    const nested = value._id;
    if (nested !== value) {
      return toId(nested);
    }
  }

  if (value instanceof Date) {
    return "";
  }

  if (
    value &&
    typeof (value as { toString: () => string }).toString === "function"
  ) {
    const text = (value as { toString: () => string }).toString();
    if (text !== "[object Object]") {
      return text;
    }
  }

  return "";
};

export const toIsoDate = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return undefined;
};

export const asString = (value: unknown): string | undefined => {
  return typeof value === "string" ? value : undefined;
};

export const asNumber = (value: unknown): number | undefined => {
  return typeof value === "number" ? value : undefined;
};

export const asBoolean = (value: unknown): boolean | undefined => {
  return typeof value === "boolean" ? value : undefined;
};

export const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

export const asRecord = (value: unknown): Record<string, unknown> | null => {
  return isRecord(value) ? value : null;
};
