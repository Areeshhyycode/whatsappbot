import { pipeline } from "@huggingface/transformers";

/**
 * Turns text into "embeddings" — lists of numbers that capture meaning.
 * Two pieces of text with similar meaning get similar number lists, which
 * lets us search a document by meaning instead of exact keywords.
 *
 * The model runs locally on your machine — it is free and needs no API key.
 * The first call downloads the model (~25 MB); after that it is cached.
 */
const MODEL = "Xenova/all-MiniLM-L6-v2"; // small, fast, 384 numbers per text

// Load the model only once, and reuse it for every call.
let _extractorPromise;
function getExtractor() {
  if (!_extractorPromise) {
    _extractorPromise = pipeline("feature-extraction", MODEL);
  }
  return _extractorPromise;
}

/**
 * Embed one string or an array of strings.
 * @param {string|string[]} texts
 * @returns {Promise<number[]|number[][]>} one vector, or one per input string
 */
export async function embed(texts) {
  const isArray = Array.isArray(texts);
  const input = isArray ? texts : [texts];

  const extractor = await getExtractor();
  const output = await extractor(input, { pooling: "mean", normalize: true });
  const vectors = output.tolist(); // -> array of number arrays

  return isArray ? vectors : vectors[0];
}
