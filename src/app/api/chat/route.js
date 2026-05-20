import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Bot from "@/models/Bot";
import { askAI } from "@/lib/groq";
import { retrieveContext } from "@/lib/rag";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/chat
 * Body: { botId, message }
 * Loads the bot, asks Groq using the bot's document, returns the reply.
 * This is the "test your bot" feature on the website.
 */
export async function POST(req) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in." }, { status: 401 });
    }

    const { botId, message } = await req.json();

    if (!botId || !message || !message.trim()) {
      return NextResponse.json(
        { error: "Both botId and message are required." },
        { status: 400 }
      );
    }

    await connectDB();
    // The owner filter makes sure users can only chat with their own bots.
    const bot = await Bot.findOne({ _id: botId, owner: user.uid }).lean();
    if (!bot) {
      return NextResponse.json({ error: "Bot not found." }, { status: 404 });
    }

    // RAG: find the chunks most relevant to this question.
    // Older bots created before Phase 3 have no chunks — fall back to the
    // full document text so they still work.
    const context =
      bot.chunks && bot.chunks.length > 0
        ? await retrieveContext(bot.chunks, message.trim())
        : bot.documentText || "";

    const reply = await askAI({
      systemPrompt: bot.systemPrompt,
      documentText: context,
      userMessage: message.trim(),
    });

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
