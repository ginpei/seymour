import { join } from "node:path";

export const BASE_DIR_NAME = ".seymour";
export const EMBEDDING_CACHE_DIR_NAME = "embeddings";
export const CHUNKS_DIR_NAME = "chunks";

/**
 * Gets the absolute path to the base directory (.seymour).
 * @returns The absolute path to the base directory.
 */
export function getBaseDir(): string {
  // Assuming the project root is the current working directory
  return join(process.cwd(), BASE_DIR_NAME);
}

/**
 * Gets the absolute path to the embedding cache directory (.seymour/embeddings).
 */
export function getEmbeddingCacheDir(): string {
  return join(getBaseDir(), EMBEDDING_CACHE_DIR_NAME);
}

/**
 * Gets the absolute path to the chunks directory (.seymour/chunks).
 * @returns The absolute path to the chunks directory.
 */
export function getChunksDir(): string {
  return join(getBaseDir(), CHUNKS_DIR_NAME);
}

/**
 * Gets the absolute path to a specific chunk set directory.
 * @param id - The chunk set ID.
 * @returns The absolute path to the chunk set directory.
 */
export function getChunkSetDir(id: string): string {
  return join(getChunksDir(), id);
}
