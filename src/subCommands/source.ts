import { select, confirm } from "@inquirer/prompts";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { listChunkSetIds } from "../lib/chunk";
import { getChunkSetDir } from "../lib/paths";
import { ChunkSetMeta } from "../lib/chunk";

interface SourceChoice {
  name: string;
  value: string | null; // null for Cancel
  description?: string;
}

export async function sourceSubCommand(): Promise<void> {
  const ids = listChunkSetIds();

  if (ids.length === 0) {
    console.log("No sources found. Use the 'read' command to add sources.");
    return;
  }

  const sourceMetas: (ChunkSetMeta & { display: string })[] = [];
  for (const id of ids) {
    const metaFilePath = join(getChunkSetDir(id), "meta.json");
    try {
      const content = readFileSync(metaFilePath, "utf-8");
      const meta = JSON.parse(content) as ChunkSetMeta;
      sourceMetas.push({ ...meta, display: `[${meta.type}] ${meta.pattern}` });
    } catch (error) {
      console.error(`Error reading meta file for ID ${id}:`, error);
      // Optionally skip this source or handle error differently
    }
  }

  if (sourceMetas.length === 0) {
    console.log("Could not read metadata for any sources.");
    return;
  }

  const choices: SourceChoice[] = [
    { name: "Cancel", value: null },
    ...sourceMetas.map((meta) => ({
      name: meta.display,
      value: meta.id,
      description: `ID: ${meta.id}`,
    })),
  ];

  try {
    const selectedId = await select({
      message: "Select a source to manage (or Cancel):",
      choices: choices,
    });

    if (selectedId === null) {
      console.log("Operation cancelled.");
      return;
    }

    // Find the selected meta for display in confirmation
    const selectedMeta = sourceMetas.find(meta => meta.id === selectedId);
    if (!selectedMeta) {
        console.error("Selected source not found. This should not happen.");
        return;
    }

    const confirmed = await confirm({
      message: `Are you sure you want to delete the source \"${selectedMeta.display}\" (ID: ${selectedId})? This will remove its chunks and cannot be undone.`,
      default: false,
    });

    if (confirmed) {
      const dirToDelete = getChunkSetDir(selectedId);
      try {
        rmSync(dirToDelete, { recursive: true, force: true });
        console.log(`Source \"${selectedMeta.display}\" (ID: ${selectedId}) deleted successfully.`);
      } catch (error) {
        console.error(`Error deleting directory ${dirToDelete}:`, error);
      }
    } else {
      console.log("Deletion cancelled.");
    }
  } catch (error) {
    // Handle potential errors from inquirer prompts (e.g., user force quits)
    if (error instanceof Error && error.message.includes('User force closed')) {
        console.log('\\nOperation cancelled by user.');
    } else {
        console.error("An unexpected error occurred:", error);
    }
  }
}
