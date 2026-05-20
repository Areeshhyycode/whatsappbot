/**
 * One-time setup: create the Atlas Vector Search index on the "chunks"
 * collection. This lets the app search documents by meaning, fast.
 *
 * Run it with:  npm run setup-index
 *
 * Needs a MongoDB Atlas cluster (the free tier works). Until the index
 * exists, the app automatically uses a slower in-memory fallback.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/mongodb.js";
import Chunk from "../src/models/Chunk.js";

const INDEX_NAME = "vector_index";

async function main() {
  await connectDB();
  console.log("Connected to MongoDB.");

  // The collection must exist before an index can be created on it.
  await Chunk.createCollection().catch(() => {});
  const collection = Chunk.collection;

  let existing = [];
  try {
    existing = await collection.listSearchIndexes().toArray();
  } catch (err) {
    console.error(
      "\nCould not list search indexes.\n" +
        "Atlas Vector Search needs a MongoDB Atlas cluster (not a local DB).\n",
      err.message
    );
    process.exit(1);
  }

  if (existing.some((i) => i.name === INDEX_NAME)) {
    console.log(`Search index "${INDEX_NAME}" already exists. Nothing to do.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  await collection.createSearchIndex({
    name: INDEX_NAME,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: "embedding",
          numDimensions: 768, // Google text-embedding-004 output size
          similarity: "cosine",
        },
        // Lets us restrict a search to one bot's chunks.
        { type: "filter", path: "bot" },
      ],
    },
  });

  console.log(`\n✅ Created vector index "${INDEX_NAME}".`);
  console.log("   It takes about a minute to finish building on Atlas.");
  console.log("   Until then, the app uses an automatic in-memory fallback.\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
