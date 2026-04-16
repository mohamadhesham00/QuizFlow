import User from "../models/User";
import { signToken } from "../utils/jwt";
import { toUserDto } from "../dtos/user.dto";

export const loginUser = async (input: { email: string; password: string }) => {
  const user = await User.findOne({ email: input.email }).select("+password");
  if (!user) {
    const error = new Error("Invalid credentials");
    (error as Error & { statusCode?: number }).statusCode = 401;
    throw error;
  }

  const isValid = await user.comparePassword(input.password);
  if (!isValid) {
    const error = new Error("Invalid credentials");
    (error as Error & { statusCode?: number }).statusCode = 401;
    throw error;
  }

  const token = signToken({
    userId: user._id.toString(),
    role: user.role,
  });

  return {
    token,
    user: toUserDto(user),
  };
};
