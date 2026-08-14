import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { chunkText } from "@/lib/chunking";
import { embedChunks } from "@/lib/embeddings";
import { addChunks, clearStore } from "@/lib/store";

// This route handles the file upload. It runs on the server, never
// in the user's browser, which is why it's safe to use our API key here.
export async function POST(req: NextRequest) {
  console.log("Key loaded:", process.env.GEMINI_API_KEY?.slice(0, 10));
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const MAX_FILE_SIZE_MB = 4;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        {
          error: `File is too large (${(file.size / 1024 / 1024).toFixed(
            1
          )}MB). Please upload a PDF under ${MAX_FILE_SIZE_MB}MB.`,
        },
        { status: 400 }
      );
    }

    // Step 1: Read the raw bytes of the uploaded PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 2: Extract plain text from the PDF
    const parsed = await pdfParse(buffer);
    const text = parsed.text;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Couldn't extract any text from this PDF" },
        { status: 400 }
      );
    }

    // Step 3: Split the text into overlapping chunks
    const chunks = chunkText(text);

    // Step 4: Convert each chunk into a vector (embedding)
    const embeddings = await embedChunks(chunks);

    // Step 5: Store chunks + embeddings so we can search them later.
    // We clear the store first since this demo supports one document at a time.
    await clearStore();
    await addChunks(chunks, embeddings, file.name);

    return NextResponse.json({
      success: true,
      chunkCount: chunks.length,
      fileName: file.name,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong processing the PDF" },
      { status: 500 }
    );
  }
}
