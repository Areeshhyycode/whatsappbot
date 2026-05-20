import { NextResponse } from "next/server";
import { extractText } from "@/lib/extract";

// pdf-parse needs the Node.js runtime (not the Edge runtime).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/upload
 * Accepts a multipart form with a "file" field (PDF or text).
 * Extracts the text and returns it — the file itself is not stored.
 */
export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Please choose a file to upload." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, file.name);

    if (!text) {
      return NextResponse.json(
        { error: "Could not read any text from that file." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      fileName: file.name,
      charCount: text.length,
      text,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read file: " + err.message },
      { status: 500 }
    );
  }
}
