import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Bot from "@/models/Bot";
import { askAI } from "@/lib/groq";
import { getBotContext } from "@/lib/rag";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/whatsapp/webhook
 * Meta calls this once to verify the webhook. We echo back the "challenge"
 * value only if the verify token matches the one in our .env file.
 */
export async function GET(req) {
  const params = new URL(req.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Verification failed", { status: 403 });
}

/** Answer one incoming WhatsApp message. */
async function handleMessage(phoneNumberId, from, text) {
  await connectDB();

  // Route the message to the bot connected to this WhatsApp number.
  const bot = await Bot.findOne({
    whatsappPhoneNumberId: phoneNumberId,
  }).lean();

  if (!bot) {
    console.warn(`No bot is connected to phone_number_id ${phoneNumberId}`);
    return;
  }

  const context = await getBotContext(bot, text);
  const reply = await askAI({
    systemPrompt: bot.systemPrompt,
    documentText: context,
    userMessage: text,
  });
  await sendWhatsAppMessage(phoneNumberId, from, reply);
}

/**
 * POST /api/whatsapp/webhook
 * Meta sends incoming messages here. We always reply 200 quickly so Meta
 * does not keep retrying.
 */
export async function POST(req) {
  try {
    const body = await req.json();

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const phoneNumberId = value.metadata?.phone_number_id;

        // `value.messages` holds incoming messages; status updates are ignored.
        for (const message of value.messages || []) {
          if (message.type !== "text") continue;
          const text = message.text?.body?.trim();
          if (!text || !phoneNumberId) continue;

          console.log(`WhatsApp [${message.from}]: ${text}`);
          await handleMessage(phoneNumberId, message.from, text);
        }
      }
    }
  } catch (err) {
    console.error("Webhook error:", err.message);
  }

  return NextResponse.json({ received: true });
}
