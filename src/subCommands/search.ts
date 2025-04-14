import { readChunks } from "../lib/files";
import { findTopMatches, postTextEmbedding } from "../lib/llm";

export async function search(question: string, OPENAI_API_KEY: string) {
  const chunks = readChunks();

  const query = `About: ${question}`;
  console.log(`Embedding your question...`, query);
  const vector = await postTextEmbedding(query, OPENAI_API_KEY);

  const startedAt = Date.now();
  const topMatches = findTopMatches(chunks, vector, 5);
  const elapsed = Date.now() - startedAt;

  console.log(
    `Top matches (${elapsed} ms/${chunks.length} chunks):`,
    topMatches.map((v) => `${v.filePath} (${v.similarity.toFixed(2)})`),
  );
}
