import { resolve } from "node:path";
import { VectoredChunks } from "./llm";
import { existsSync, writeFileSync } from "node:fs";

export function chunksExist(): boolean {
  const chunkPath = getChunkFilePath();
  return existsSync(chunkPath);
}

export function readChunks(): VectoredChunks[] {
  const chunkPath = getChunkFilePath();

  if (!existsSync(chunkPath)) {
    throw new Error("Chunks file not found");
  }
  
  try {
    const chunks = require(chunkPath);
    return chunks;
  } catch (error) {
    throw new Error("Failed to read chunks file");
  }
}

export function writeChunks(chunks: VectoredChunks[]) {
  const chunkPath = getChunkFilePath();
  writeFileSync(chunkPath, JSON.stringify(chunks, null, 2));
}

function getChunkFilePath() {
  const chunkPath = resolve(__dirname, "../../../chunks.json");
  return chunkPath;
}
