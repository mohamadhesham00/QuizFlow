import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, type UserRole } from "../constants/roles";

export type { UserRole } from "../constants/roles";

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {}

const userSchema = new Schema<IUser, IUserModel>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: [ROLES.TEACHER, ROLES.STUDENT],
      default: ROLES.STUDENT,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function save() {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return;
});

userSchema.methods.comparePassword = async function comparePassword(
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser, IUserModel>("User", userSchema);

export default User;
