import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const BATCH_SIZE = 10; // chunks sent per API call
const MAX_RETRIES = 3;

/**
 * Embeds a batch of texts in a single API call, retrying with
 * exponential backoff if we hit a rate limit (HTTP 429).
 */
async function embedBatch(texts: string[], attempt = 0): Promise<number[][]> {
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: texts,
    });

    if (!response.embeddings || response.embeddings.length === 0) {
      throw new Error("No embeddings returned from Gemini");
    }

    return response.embeddings.map((e) => e.values ?? []);
  } catch (err: any) {
    const isRateLimit =
      err?.status === 429 || err?.message?.includes("RESOURCE_EXHAUSTED");

    if (isRateLimit && attempt < MAX_RETRIES) {
      const waitMs = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s
      console.log(
        `Rate limited - retrying in ${waitMs}ms (attempt ${attempt + 1})`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return embedBatch(texts, attempt + 1);
    }

    throw err;
  }
}

/** Embeds a single piece of text (used for the user's question). */
export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedBatch([text]);
  return embedding;
}

/**
 * Embeds many chunks, sending them in batches of BATCH_SIZE instead of
 * one at a time. For a 100-chunk document, this is ~10 API calls
 * instead of 100 - much less likely to hit the free-tier rate limit.
 */
export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchEmbeddings = await embedBatch(batch);
    allEmbeddings.push(...batchEmbeddings);
  }

  return allEmbeddings;
}
