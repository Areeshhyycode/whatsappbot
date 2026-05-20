/**
 * WhatsApp bot worker.
 *
 * This is a standalone, long-running Node process (separate from the website).
 * It links to WhatsApp via a QR code, loads a bot from MongoDB, and replies to
 * incoming messages using Groq AI + that bot's knowledge document.
 *
 * Run it with:  npm run bot
 */
import "dotenv/config"; // loads the .env file

import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";

import { connectDB } from "../src/lib/mongodb.js";
import Bot from "../src/models/Bot.js";
import { askAI } from "../src/lib/groq.js";
import { getBotContext } from "../src/lib/rag.js";

const PREFIX = process.env.BOT_PREFIX || "!";
const REQUIRE_PREFIX = process.env.REQUIRE_PREFIX === "true";

/** Load the bot to run: a specific one if BOT_ID is set, else the newest. */
async function loadBot() {
  await connectDB();
  if (process.env.BOT_ID) {
    return Bot.findById(process.env.BOT_ID).lean();
  }
  return Bot.findOne().sort({ createdAt: -1 }).lean();
}

async function main() {
  const bot = await loadBot();
  if (!bot) {
    console.log(
      "⚠️  No bot found in the database.\n" +
        "    Start the website with `npm run dev` and create a bot first."
    );
    process.exit(1);
  }
  console.log(
    `Loaded bot: "${bot.name}" — ${bot.documentText?.length || 0} characters of knowledge.`
  );

  const client = new Client({
    authStrategy: new LocalAuth(), // saves the session so you scan the QR only once
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  client.on("qr", (qr) => {
    console.log("\nScan this QR code in WhatsApp → Settings → Linked Devices:\n");
    qrcode.generate(qr, { small: true });
  });

  client.on("authenticated", () => console.log("Authenticated with WhatsApp."));

  client.on("ready", () =>
    console.log(`\n✅ Bot "${bot.name}" is ready! Send it a WhatsApp message.\n`)
  );

  client.on("message", async (msg) => {
    const text = (msg.body || "").trim();
    if (!text) return;

    // Optionally only respond to messages that start with the prefix (e.g. "!").
    let question = text;
    if (REQUIRE_PREFIX) {
      if (!text.startsWith(PREFIX)) return;
      question = text.slice(PREFIX.length).trim();
    }
    if (!question) return;

    console.log(`[${msg.from}] ${question}`);
    try {
      const chat = await msg.getChat();
      await chat.sendStateTyping();

      // RAG: pick the document context most relevant to the question.
      const context = await getBotContext(bot, question);

      const reply = await askAI({
        systemPrompt: bot.systemPrompt,
        documentText: context,
        userMessage: question,
      });
      await msg.reply(reply);
    } catch (err) {
      console.error("Error replying:", err.message);
      await msg.reply("Sorry, something went wrong. Please try again.");
    }
  });

  client.initialize();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
