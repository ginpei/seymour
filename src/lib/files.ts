import { resolve } from "node:path";
import { VectoredChunks } from "./llm";
import { existsSync, writeFileSync } from "node:fs";

export function readChunks(): VectoredChunks[] {
  const chunkPath = getChunkFilePath();

  if (!existsSync(chunkPath)) {
    throw new Error("Generate chunks.json first");
  }
  const chunks = require(chunkPath);
  return chunks;
}

export function writeChunks(chunks: VectoredChunks[]) {
  const chunkPath = getChunkFilePath();
  writeFileSync(chunkPath, JSON.stringify(chunks, null, 2));
}

function getChunkFilePath() {
  const chunkPath = resolve(__dirname, "../../../chunks.json");
  return chunkPath;
}
