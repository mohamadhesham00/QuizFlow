import { asRecord, asString, toId } from "./helpers";

export interface UserSummaryDto {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
}

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export const toUserSummaryDto = (value: unknown): UserSummaryDto | null => {
  const entity = asRecord(value);
  if (!entity) {
    return null;
  }

  const id = toId(entity);
  if (!id) {
    return null;
  }

  return {
    id,
    fullName: asString(entity.fullName),
    email: asString(entity.email),
    role: asString(entity.role),
  };
};

export const toUserDto = (value: {
  _id: unknown;
  fullName: string;
  email: string;
  role: string;
}): UserDto => ({
  id: toId(value._id),
  fullName: value.fullName,
  email: value.email,
  role: value.role,
});
