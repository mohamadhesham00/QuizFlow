import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { redisClient } from "../config/redis";

const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = header.split(" ")[1];

  redisClient
    .get(`auth:blacklist:${token}`)
    .then((isBlacklisted) => {
      if (isBlacklisted) {
        res.status(401).json({ message: "Token has been revoked" });
        return;
      }

      try {
        const payload = verifyToken(token);
        req.user = payload;
        next();
      } catch {
        res.status(401).json({ message: "Invalid or expired token" });
      }
    })
    .catch(() => {
      res.status(500).json({ message: "Authentication check failed" });
    });
};

export default authMiddleware;
