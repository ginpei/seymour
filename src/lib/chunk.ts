import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { VectoredChunk } from "./search";
import { getBaseDir, getChunksDir, getChunkSetDir } from "./paths";

/**
 * Represents the metadata for a chunk set.
 */
export interface ChunkSetMeta {
  id: string;
  type: string;
  pattern: string;
}

/**
 * Calculates the SHA256 hash for a given type and pattern.
 * @param type - The type of the read command.
 * @param pattern - The pattern used in the read command.
 * @returns The SHA256 hash string.
 */
export function calculateChunkSetId(type: string, pattern: string): string {
  const hash = createHash("sha256");
  hash.update(`${type}@${pattern}`);
  return hash.digest("hex");
}

/**
 * Ensures that the specified chunk set directory exists. Creates it if necessary.
 * @param id - The chunk set ID.
 */
export function ensureChunkSetDirExists(id: string): void {
  // Use recursive option to create parent directories if they don't exist
  mkdirSync(getChunkSetDir(id), { recursive: true });
}

/**
 * Writes the metadata file (meta.json) for a chunk set.
 * @param id - The chunk set ID.
 * @param meta - The metadata object to write.
 */
export function writeMetaFile(id: string, meta: ChunkSetMeta): void {
  ensureChunkSetDirExists(id);
  const metaFilePath = join(getChunkSetDir(id), "meta.json");
  writeFileSync(metaFilePath, JSON.stringify(meta, null, 2));
}

/**
 * Writes the chunks file (chunks.json) for a chunk set.
 * @param id - The chunk set ID.
 * @param chunks - The array of VectoredChunk objects to write.
 */
export function writeChunksFile(id: string, chunks: VectoredChunk[]): void {
  ensureChunkSetDirExists(id);
  const chunksFilePath = join(getChunkSetDir(id), "chunks.json");
  writeFileSync(chunksFilePath, JSON.stringify(chunks, null, 2));
}

/**
 * Reads the chunks file (chunks.json) for a specific chunk set.
 * @param id - The chunk set ID.
 * @returns The array of VectoredChunk objects, or null if the file doesn't exist.
 */
export function readChunksFile(id: string): VectoredChunk[] | null {
    const chunksFilePath = join(getChunkSetDir(id), "chunks.json");
    if (existsSync(chunksFilePath)) {
        const content = readFileSync(chunksFilePath, 'utf-8');
        try {
            return JSON.parse(content) as VectoredChunk[];
        } catch (error) {
            console.error(`Error parsing chunks file ${chunksFilePath}:`, error);
            return null;
        }
    }
    return null;
}

/**
 * Lists all existing chunk set IDs (directory names) within the chunks directory.
 * @returns An array of chunk set IDs.
 */
export function listChunkSetIds(): string[] {
  const chunksDir = getChunksDir();
  if (!existsSync(chunksDir)) {
    return [];
  }
  try {
    const entries = readdirSync(chunksDir, { withFileTypes: true });
    return entries
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
  } catch (error) {
    console.error("Error listing chunk set IDs:", error);
    return [];
  }
}

/**
 * Reads all chunks from all existing chunk sets.
 * @returns A combined array of VectoredChunk objects from all sets.
 */
export function readAllChunks(): VectoredChunk[] {
    const allChunks: VectoredChunk[] = [];
    const ids = listChunkSetIds();
    for (const id of ids) {
        const chunks = readChunksFile(id);
        if (chunks) {
            allChunks.push(...chunks);
        }
    }
    return allChunks;
}
