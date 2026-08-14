/**
 * Splits a long piece of text into smaller overlapping chunks.
 *
 * Why overlap? If we cut chunks with zero overlap, a sentence that
 * spans a chunk boundary gets split in half and loses meaning.
 * A small overlap (e.g. 50 words) means each chunk still has some
 * of the previous chunk's context.
 *
 * We chunk by words here (simple + good enough for a portfolio project).
 * Production systems sometimes chunk by tokens or sentences instead.
 */
export function chunkText(
  text: string,
  chunkSize = 300,
  overlap = 50
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(" ");
    chunks.push(chunk);

    if (end === words.length) break;
    start += chunkSize - overlap;
  }

  return chunks;
}
