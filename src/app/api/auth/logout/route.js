import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout — clear the login cookie. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Overwrite the cookie with an empty, already-expired one.
  res.cookies.set(COOKIE.name, "", { ...COOKIE.options, maxAge: 0 });
  return res;
}
