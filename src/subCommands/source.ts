import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listChunkSetIds } from "../lib/chunkManager";
import { getChunkSetDir } from "../lib/paths";
import { ChunkSetMeta } from "../lib/chunkManager";

export async function sourceSubCommand(): Promise<void> {
  console.log("Listing sources...");

  const ids = listChunkSetIds();

  if (ids.length === 0) {
    console.log("No sources found. Use the 'read' command to add sources.");
    return;
  }

  console.log("\nSources:");
  for (const id of ids) {
    const metaFilePath = join(getChunkSetDir(id), "meta.json");
    try {
      const content = readFileSync(metaFilePath, "utf-8");
      const meta = JSON.parse(content) as ChunkSetMeta;
      console.log(`[${meta.type}] ${meta.pattern}`);
    } catch (error) {
      console.error(`Error reading meta file for ID ${id}:`, error);
    }
  }
}
