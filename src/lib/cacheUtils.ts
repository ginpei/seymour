import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const EMBEDDING_CACHE_DIR = ".seymour/embeddings";

/**
 * Cache the embedding vector for a given content string.
 */
export function cacheEmbedding(
  content: string,
  vector: number[],
): void {
  const hash = createHash("sha256");
  hash.update(content);
  const hex = hash.digest("hex");

  const filePath = `${EMBEDDING_CACHE_DIR}/${hex}`;
  mkdirSync(EMBEDDING_CACHE_DIR, { recursive: true });
  writeFileSync(filePath, JSON.stringify(vector));
}

/**
 * Read the cached embedding vector for a given content string.
 */
export function readEmbeddingCache(
  content: string,
): number[] | null {
  const hash = createHash("sha256");
  hash.update(content);
  const hex = hash.digest("hex");

  const filePath = `${EMBEDDING_CACHE_DIR}/${hex}`;
  try {
    const vectorJson = readFileSync(filePath, "utf-8");
    return JSON.parse(vectorJson);
  } catch (e) {
    // Cache miss or error reading file
    return null;
  }
}
