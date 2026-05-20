import mongoose from "mongoose";

/**
 * A registered user of the website. Each user only sees their own bots.
 * We never store the raw password — only a secure bcrypt hash of it.
 */
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
