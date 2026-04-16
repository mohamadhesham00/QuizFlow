import { Request, Response } from "express";
import { loginUser } from "../services/auth.service";

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await loginUser(req.body);
    res.status(200).json(result);
  } catch (error) {
    const statusCode =
      error instanceof Error
        ? (error as Error & { statusCode?: number }).statusCode || 500
        : 500;
    res.status(statusCode).json({
      message: error instanceof Error ? error.message : "Failed to login",
    });
  }
};
