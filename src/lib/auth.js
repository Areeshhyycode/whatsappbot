import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/**
 * Authentication helpers.
 *
 * Login works like this:
 *   1. password is hashed with bcrypt (never stored as plain text),
 *   2. on login we issue a signed JWT token,
 *   3. the token is kept in a secure httpOnly cookie,
 *   4. API routes read that cookie to know who is logged in.
 */

const COOKIE_NAME = "token";
const TOKEN_DAYS = 7;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to your .env file.");
  }
  return secret;
}

/** Hash a plain-text password before saving it. */
export function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

/** Check a plain-text password against a stored hash. */
export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/** Create a signed login token for a user. */
export function signToken(user) {
  return jwt.sign(
    { uid: String(user._id), email: user.email },
    getSecret(),
    { expiresIn: `${TOKEN_DAYS}d` }
  );
}

/** Verify a token. Returns its payload, or null if invalid/expired. */
export function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

/**
 * Read the logged-in user from the request cookie.
 * Returns { uid, email } or null. Use this at the top of protected routes.
 */
export async function getAuthUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Cookie name + options, shared by login/signup/logout routes. */
export const COOKIE = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_DAYS * 24 * 60 * 60,
  },
};
