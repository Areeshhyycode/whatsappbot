/**
 * Split a long document into smaller overlapping "chunks".
 *
 * Why chunks? An AI can only read so much text at once, and searching small
 * pieces is far more accurate than searching one giant blob. The overlap makes
 * sure a sentence split across two chunks is not lost.
 */
const CHUNK_SIZE = 800; // characters per chunk
const CHUNK_OVERLAP = 150; // characters shared between neighbouring chunks

export function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    chunks.push(clean.slice(start, end));
    if (end >= clean.length) break;
    start += size - overlap; // step forward, keeping some overlap
  }
  return chunks;
}
