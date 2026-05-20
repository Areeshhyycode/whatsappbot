import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Bot from "@/models/Bot";
import { askAI } from "@/lib/groq";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat
 * Body: { botId, message }
 * Loads the bot, asks Groq using the bot's document, returns the reply.
 * This is the "test your bot" feature on the website.
 */
export async function POST(req) {
  try {
    const { botId, message } = await req.json();

    if (!botId || !message || !message.trim()) {
      return NextResponse.json(
        { error: "Both botId and message are required." },
        { status: 400 }
      );
    }

    await connectDB();
    const bot = await Bot.findById(botId).lean();
    if (!bot) {
      return NextResponse.json({ error: "Bot not found." }, { status: 404 });
    }

    const reply = await askAI({
      systemPrompt: bot.systemPrompt,
      documentText: bot.documentText,
      userMessage: message.trim(),
    });

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
