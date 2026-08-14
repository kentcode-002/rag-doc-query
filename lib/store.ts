import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

/**
 * Wipes existing chunks before storing a new document - same
 * "one document at a time" behavior as the in-memory version.
 */
export async function clearStore() {
  const { error } = await supabase.from("chunks").delete().gte("id", 0);
  if (error) throw error;
}

export async function addChunks(
  chunks: string[],
  embeddings: number[][],
  documentName: string
) {
  const rows = chunks.map((text, i) => ({
    document_name: documentName,
    content: text,
    embedding: embeddings[i],
  }));

  const { error } = await supabase.from("chunks").insert(rows);
  if (error) throw error;
}

/**
 * Calls the match_chunks() function we created in SQL - the database
 * does the similarity search now, instead of our JS cosineSimilarity().
 */
export async function searchChunks(
  queryEmbedding: number[],
  topK = 4
): Promise<string[]> {
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: topK,
  });
  if (error) throw error;
  return (data ?? []).map((row: { content: string }) => row.content);
}

export async function hasDocument(): Promise<boolean> {
  const { count, error } = await supabase
    .from("chunks")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return (count ?? 0) > 0;
}
