import mongoose from "mongoose";

/**
 * One searchable piece of the document, with its embedding (meaning vector).
 * `_id: false` keeps these sub-documents small.
 */
const ChunkSchema = new mongoose.Schema(
  {
    text: String,
    embedding: [Number],
  },
  { _id: false }
);

/**
 * A "Bot" is one WhatsApp assistant a user has created.
 * Its "brain" is the text we extracted from the uploaded PDF/txt file,
 * split into embedded `chunks` so the AI can search it by meaning (RAG).
 */
const BotSchema = new mongoose.Schema(
  {
    // Which user owns this bot — they are the only one who can see/use it.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },

    // What kind of bot this is — just a label for now.
    botType: {
      type: String,
      enum: ["support", "faq", "sales", "custom"],
      default: "custom",
    },

    // Instructions that shape the bot's personality / behaviour.
    systemPrompt: {
      type: String,
      default: "You are a helpful WhatsApp assistant.",
    },

    // The uploaded knowledge document.
    documentName: { type: String, default: "" },
    documentText: { type: String, default: "" },

    // The document split into embedded chunks, used for RAG search.
    chunks: { type: [ChunkSchema], default: [] },
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

// `mongoose.models.Bot` avoids "model already compiled" errors on hot reload.
export default mongoose.models.Bot || mongoose.model("Bot", BotSchema);
