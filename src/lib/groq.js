import Groq from "groq-sdk";

// Model running on Groq's free tier. Fast and good enough for a bot.
export const GROQ_MODEL = "llama-3.3-70b-versatile";

// How much of the document we send to the AI as context.
// (A real product would use embeddings + search — see README "Phase 3".)
const MAX_CONTEXT_CHARS = 12000;

// Create the Groq client lazily so the API key is read at call time,
// after the .env file has been loaded.
let _client;
function getClient() {
  if (!_client) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set. Add it to your .env file.");
    }
    _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _client;
}

/**
 * Ask the AI a question, answered using the bot's document.
 *
 * @param {object}  args
 * @param {string}  args.systemPrompt   Personality / instructions for the bot.
 * @param {string}  args.documentText   The bot's knowledge (extracted file text).
 * @param {string}  args.userMessage    The question from the WhatsApp user.
 * @returns {Promise<string>} the AI's reply.
 */
export async function askAI({ systemPrompt, documentText, userMessage }) {
  const context = (documentText || "").slice(0, MAX_CONTEXT_CHARS);

  const system = `${systemPrompt || "You are a helpful WhatsApp assistant."}

Answer the user's question using ONLY the information in the document below.
If the answer is not in the document, politely say you don't have that information.
Keep replies short and friendly — they are read inside WhatsApp.

--- DOCUMENT START ---
${context || "(no document was provided)"}
--- DOCUMENT END ---`;

  const completion = await getClient().chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.3,
    max_tokens: 600,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    "Sorry, I couldn't generate a reply right now."
  );
}
