import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/debug
 * Shows which env vars are configured (booleans only — never the values).
 * Use this to sanity-check that all required keys are set on Vercel.
 */
export async function GET() {
  let user = null;
  try {
    user = await getAuthUser();
  } catch {
    /* getAuthUser can throw if JWT_SECRET is missing — leave user null */
  }

  return NextResponse.json({
    env: {
      MONGODB_URI: !!process.env.MONGODB_URI,
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
      JWT_SECRET: !!process.env.JWT_SECRET,
      WHATSAPP_TOKEN: !!process.env.WHATSAPP_TOKEN,
      WHATSAPP_VERIFY_TOKEN: !!process.env.WHATSAPP_VERIFY_TOKEN,
    },
    loggedIn: !!user,
    node: process.version,
    runtime: process.env.NEXT_RUNTIME || "nodejs",
    time: new Date().toISOString(),
  });
}
