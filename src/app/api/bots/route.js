import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Bot from "@/models/Bot";
import { buildChunks } from "@/lib/rag";
import { getAuthUser } from "@/lib/auth";

// This route talks to the database, so it must never be statically cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Building embeddings can take a little while on first run (model download).
export const maxDuration = 60;

/** Helper: a fresh 401 response (a Response can only be used once). */
function unauthorized() {
  return NextResponse.json({ error: "Please log in." }, { status: 401 });
}

/** GET /api/bots — list the logged-in user's bots, newest first. */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    await connectDB();
    const bots = await Bot.find({ owner: user.uid })
      .select("name botType documentName createdAt")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ bots });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST /api/bots — create a new bot owned by the logged-in user. */
export async function POST(req) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const {
      name,
      botType,
      systemPrompt,
      documentName,
      documentText,
      whatsappPhoneNumberId,
    } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "A bot name is required." },
        { status: 400 }
      );
    }

    // Split the document into embedded chunks so the bot can search it (RAG).
    const chunks = documentText ? await buildChunks(documentText) : [];

    await connectDB();
    const bot = await Bot.create({
      owner: user.uid,
      name: name.trim(),
      botType,
      systemPrompt,
      documentName,
      documentText,
      chunks,
      whatsappPhoneNumberId: (whatsappPhoneNumberId || "").trim(),
    });

    // Return a small summary (not the heavy chunk embeddings).
    return NextResponse.json(
      {
        bot: {
          _id: bot._id,
          name: bot.name,
          botType: bot.botType,
          documentName: bot.documentName,
          chunkCount: chunks.length,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE /api/bots?id=... — remove one of the user's own bots. */
export async function DELETE(req) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing bot id." }, { status: 400 });
    }

    await connectDB();
    // The owner filter makes sure a user can only delete their own bots.
    const deleted = await Bot.findOneAndDelete({ _id: id, owner: user.uid });
    if (!deleted) {
      return NextResponse.json({ error: "Bot not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
