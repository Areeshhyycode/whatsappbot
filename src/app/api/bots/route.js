import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Bot from "@/models/Bot";

// This route talks to the database, so it must never be statically cached.
export const dynamic = "force-dynamic";

/** GET /api/bots — list every bot, newest first. */
export async function GET() {
  try {
    await connectDB();
    const bots = await Bot.find()
      .select("name botType documentName createdAt")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ bots });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST /api/bots — create a new bot. */
export async function POST(req) {
  try {
    const { name, botType, systemPrompt, documentName, documentText } =
      await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "A bot name is required." },
        { status: 400 }
      );
    }

    await connectDB();
    const bot = await Bot.create({
      name: name.trim(),
      botType,
      systemPrompt,
      documentName,
      documentText,
    });

    return NextResponse.json({ bot }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE /api/bots?id=... — remove a bot. */
export async function DELETE(req) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing bot id." }, { status: 400 });
    }
    await connectDB();
    await Bot.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
