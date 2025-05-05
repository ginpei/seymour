import { readAllChunks } from "../lib/chunkManager";
import { findTopMatches, postTextEmbedding, VectoredChunk, MatchedChunk } from "../lib/llm";

export async function search(question: string, OPENAI_API_KEY: string) {
  let chunks: VectoredChunk[];
  try {
    // Read all chunks from all chunk sets
    chunks = readAllChunks();
  } catch (error) {
    console.error("\x1b[31mError: Failed to read chunk sets\x1b[0m");
    console.error(error instanceof Error ? error.message : String(error));
    console.error("\nTry regenerating your embeddings, for example:");
    console.error('\x1b[33m  seymour read md "./docs/**/*.md"\x1b[0m');
    console.error('\x1b[33m  seymour read ts "./src/**/*.ts"\x1b[0m');
    process.exit(1);
  }

  // Check if any chunks were loaded
  if (chunks.length === 0) {
    console.error("\x1b[31mError: No embeddings found\x1b[0m");
    console.error("\nYou need to generate embeddings first by running commands like:");
    console.error('\x1b[33m  seymour read md "./docs/**/*.md"\x1b[0m');
    console.error('\x1b[33m  seymour read ts "./src/**/*.ts"\x1b[0m');
    console.error("\nReplace the paths with the location of your source files.");
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
  );
  topMatches.forEach((match, index) => {
    console.log(`\n--- Match ${index + 1} (Similarity: ${match.similarity.toFixed(3)}) ---`);
    console.log(`File: ${match.filePath}`);
    if (match.header) {
      console.log(`Header: ${match.header}`);
    }
    console.log(`Content:\n${match.content}`);
  });
}
