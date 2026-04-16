import jwt from "jsonwebtoken";
import type { UserRole } from "../constants/roles";

interface JwtPayload {
  userId: string;
  role: UserRole;
}

const JWT_SECRET = process.env.JWT_SECRET || "change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

export const decodeTokenExpiration = (token: string): number | null => {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) {
    return null;
  }

  return decoded.exp;
};
