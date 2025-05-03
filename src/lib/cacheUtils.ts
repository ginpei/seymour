import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getEmbeddingCacheDir } from "./paths";

/**
 * Calculates the SHA256 hash for a given content string.
 * @param content - The content string.
 * @returns The SHA256 hash string.
 */
function getContentHash(content: string): string {
  const hash = createHash("sha256");
  hash.update(content);
  return hash.digest("hex");
}

export function cacheEmbedding(content: string, vector: number[]): void {
  const hex = getContentHash(content);

  const cacheDir = getEmbeddingCacheDir();
  const filePath = join(cacheDir, hex);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(vector));
}

export function readEmbeddingCache(content: string): number[] | null {
  const hex = getContentHash(content);

  const cacheDir = getEmbeddingCacheDir();
  const filePath = join(cacheDir, hex);
  try {
    const vectorJson = readFileSync(filePath, "utf-8");
    return JSON.parse(vectorJson);
  } catch (e) {
    return null;
  }
}
