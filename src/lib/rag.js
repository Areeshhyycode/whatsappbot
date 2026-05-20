import mongoose from "mongoose";
import { chunkText } from "./chunk.js";
import { embed } from "./embeddings.js";
import { connectDB } from "./mongodb.js";
import Chunk from "../models/Chunk.js";

/**
 * RAG = Retrieval-Augmented Generation.
 *
 * Instead of sending a whole document to the AI, we:
 *   1. split the document into chunks and embed each one (buildChunks),
 *   2. store the chunks in their own collection,
 *   3. when a question comes in, find the chunks closest in meaning
 *      (getBotContext — uses a vector database, with fallbacks),
 *   4. send only those few relevant chunks to the AI.
 */

/** How many chunks to feed the AI per question. */
const TOP_K = 4;

/** Name of the Atlas Vector Search index (created by `npm run setup-index`). */
const VECTOR_INDEX = "vector_index";

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
 * Cosine similarity. Our embeddings are normalized, so this is just the
 * dot product — bigger means "more similar in meaning".
 */
function similarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Rank a list of in-memory chunks against a question (the fallback search,
 * used when the vector database index is not available).
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
 * Search a bot's chunks using MongoDB Atlas Vector Search ($vectorSearch).
 * This runs inside the database and scales to very large documents.
 * Throws if the "vector_index" search index has not been created yet.
 */
async function vectorSearch(botId, question, topK = TOP_K) {
  const queryVector = await embed(question);

  const results = await Chunk.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX,
        path: "embedding",
        queryVector,
        numCandidates: 100,
        limit: topK,
        // Only search this bot's chunks.
        filter: { bot: new mongoose.Types.ObjectId(String(botId)) },
      },
    },
    { $project: { _id: 0, text: 1 } },
  ]);

  return results.map((r) => r.text).join("\n\n---\n\n");
}

/**
 * Get the document context for a bot answering a question.
 *
 * Tries the vector database first, then falls back gracefully so the app
 * always works — even before the Atlas index is created.
 */
export async function getBotContext(bot, question) {
  await connectDB();

  // 1. Proper vector-database search (fast, scales to large documents).
  try {
    const context = await vectorSearch(bot._id, question);
    if (context) return context;
  } catch (err) {
    console.warn("Vector search unavailable — using fallback:", err.message);
  }

  // 2. Fallback: load this bot's chunks and rank them in memory.
  const docs = await Chunk.find({ bot: bot._id })
    .select("text embedding -_id")
    .lean();
  if (docs.length > 0) {
    return retrieveContext(docs, question);
  }

  // 3. Legacy fallback: chunks embedded in the bot document (older bots).
  if (bot.chunks && bot.chunks.length > 0) {
    return retrieveContext(bot.chunks, question);
  }

  // 4. Last resort: the whole document text.
  return bot.documentText || "";
}
