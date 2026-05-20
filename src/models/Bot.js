import mongoose from "mongoose";

/**
 * A "Bot" is one WhatsApp assistant a user has created.
 * Its "brain" is the text we extracted from the uploaded PDF/txt file.
 */
const BotSchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

// `mongoose.models.Bot` avoids "model already compiled" errors on hot reload.
export default mongoose.models.Bot || mongoose.model("Bot", BotSchema);
