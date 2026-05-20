import { PDFParse } from "pdf-parse";

/**
 * Extract plain text from an uploaded file buffer.
 * Supports PDF files and plain-text files (.txt, .md, etc.).
 *
 * @param {Buffer} buffer    raw file contents
 * @param {string} fileName  original file name (used to detect the type)
 * @returns {Promise<string>} the extracted text
 */
export async function extractText(buffer, fileName = "") {
  const isPdf = fileName.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return (result.text || "").trim();
    } finally {
      // Free the PDF worker resources.
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }
    }
  }

  // Anything else is treated as plain text.
  return buffer.toString("utf-8").trim();
}
