import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword, signToken, COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/auth/signup — create an account and log in. */
export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    await connectDB();
    const cleanEmail = email.toLowerCase().trim();

    if (await User.findOne({ email: cleanEmail })) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const user = await User.create({
      email: cleanEmail,
      passwordHash: await hashPassword(password),
    });

    const res = NextResponse.json(
      { user: { email: user.email } },
      { status: 201 }
    );
    res.cookies.set(COOKIE.name, signToken(user), COOKIE.options);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
