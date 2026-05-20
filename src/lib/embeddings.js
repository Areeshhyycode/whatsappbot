/**
 * Turns text into "embeddings" — lists of numbers that capture meaning.
 * Two pieces of text with similar meaning get similar number lists, which
 * lets us search a document by meaning instead of exact keywords.
 *
 * Uses Google's free embedding API (Gemini / AI Studio). It needs no credit
 * card and runs in the cloud, so it works well on serverless hosting.
 * Get a free key at https://aistudio.google.com/apikey
 */

const MODEL = "text-embedding-004"; // Google's model — 768 numbers per text
const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`;

// Google allows up to 100 texts per batch request.
const BATCH_SIZE = 100;

function getKey() {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_API_KEY is not set. Add it to your .env file.");
  }
  return key;
}

/** Scale a vector to length 1, so dot product equals cosine similarity. */
function normalize(vec) {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const magnitude = Math.sqrt(sum) || 1;
  return vec.map((v) => v / magnitude);
}

/** Embed up to BATCH_SIZE texts in one API call. */
async function embedBatch(texts) {
  const res = await fetch(`${ENDPOINT}?key=${getKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
      })),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Embedding API failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  return (data.embeddings || []).map((e) => normalize(e.values));
}

/**
 * Embed one string or an array of strings.
 * @param {string|string[]} texts
 * @returns {Promise<number[]|number[][]>} one vector, or one per input string
 */
export async function embed(texts) {
  const isArray = Array.isArray(texts);
  const input = isArray ? texts : [texts];

  // Send the texts in batches so large documents do not hit the API limit.
  const vectors = [];
  for (let i = 0; i < input.length; i += BATCH_SIZE) {
    const batch = await embedBatch(input.slice(i, i + BATCH_SIZE));
    vectors.push(...batch);
  }

  return isArray ? vectors : vectors[0];
}
