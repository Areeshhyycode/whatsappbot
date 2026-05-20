import { chunkText } from "./chunk.js";
import { embed } from "./embeddings.js";

/**
 * RAG = Retrieval-Augmented Generation.
 *
 * Instead of sending a whole document to the AI, we:
 *   1. split the document into chunks and embed each one (buildChunks),
 *   2. when a question comes in, embed the question and find the chunks
 *      whose meaning is closest to it (retrieveContext),
 *   3. send only those few relevant chunks to the AI.
 *
 * This makes answers accurate even for large documents.
 */

/** How many chunks to feed the AI per question. */
const TOP_K = 4;

/**
 * Build embedded chunks from a document's raw text.
 * @returns {Promise<{text:string, embedding:number[]}[]>}
 */
export async function buildChunks(text) {
  const pieces = chunkText(text);
  if (pieces.length === 0) return [];

  const vectors = await embed(pieces);
  return pieces.map((t, i) => ({ text: t, embedding: vectors[i] }));
}

/**
 * Cosine similarity. Our embeddings are already normalized, so this is
 * just the dot product — bigger means "more similar in meaning".
 */
function similarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Find the chunks most relevant to a question and join them into one
 * context string to give the AI.
 *
 * @param {{text:string, embedding:number[]}[]} chunks
 * @param {string} question
 * @param {number} topK
 * @returns {Promise<string>}
 */
export async function retrieveContext(chunks, question, topK = TOP_K) {
  if (!chunks || chunks.length === 0) return "";

  const questionVector = await embed(question);

  const ranked = chunks
    .map((c) => ({ text: c.text, score: similarity(questionVector, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return ranked.map((r) => r.text).join("\n\n---\n\n");
}

/**
 * Get the document context for a bot answering a question.
 *
 * One shared place for retrieval, used by the website chat, the WhatsApp
 * worker and the Cloud API webhook. Bots with embedded chunks use RAG;
 * older bots fall back to their full document text.
 */
export async function getBotContext(bot, question) {
  if (bot?.chunks && bot.chunks.length > 0) {
    return retrieveContext(bot.chunks, question);
  }
  return bot?.documentText || "";
}
