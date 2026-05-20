import mongoose from "mongoose";

/**
 * One searchable piece of a bot's document, stored in its OWN collection
 * (separate from the Bot document).
 *
 * Why a separate collection? MongoDB Atlas Vector Search needs one document
 * per vector. Keeping chunks separate also stops a Bot document from growing
 * huge for large files (MongoDB documents have a 16 MB limit).
 */
const ChunkSchema = new mongoose.Schema({
  bot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bot",
    required: true,
    index: true,
  },
  text: { type: String, required: true },

  // 768 numbers from Google's text-embedding-004 model.
  embedding: { type: [Number], required: true },
});

export default mongoose.models.Chunk || mongoose.model("Chunk", ChunkSchema);
