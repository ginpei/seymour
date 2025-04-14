import { chunksExist, readChunks } from "../lib/files";
import { findTopMatches, postTextEmbedding, VectoredChunks } from "../lib/llm";

export async function search(question: string, OPENAI_API_KEY: string) {
  if (!chunksExist()) {
    console.error("\x1b[31mError: No embeddings found\x1b[0m");
    console.error("\nYou need to generate embeddings first by running:");
    console.error('\x1b[33m  seymour generate "./path/to/docs/**/*.md"\x1b[0m');
    console.error("\nReplace the path with the location of your markdown files.");
    process.exit(1);
  }

  let chunks: VectoredChunks[];
  try {
    chunks = readChunks();
  } catch (error) {
    console.error("\x1b[31mError: Failed to read embeddings\x1b[0m");
    console.error(error instanceof Error ? error.message : String(error));
    console.error("\nTry regenerating your embeddings:");
    console.error('\x1b[33m  seymour generate "./path/to/docs/**/*.md"\x1b[0m');
    process.exit(1);
  }

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
