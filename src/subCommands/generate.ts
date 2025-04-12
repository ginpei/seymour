import { existsSync, statSync } from "node:fs";
import { writeChunks } from "../lib/files";
import { generateDocumentChunks } from "../lib/generator";

export async function generate(pathOrPattern: string) {
  const pattern = pathToPattern(pathOrPattern);

  const chunks = await generateDocumentChunks({
    cacheDir: './cache',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    pattern,
    onEmbedProgress: (index, length) => {
      process.stdout.write(`Embedding ${index} / ${length} (${((index / length) * 100).toFixed(2)}%)\r`);
      if (index === length) {
        process.stdout.write(`\n`);
      }
    },
  });

  writeChunks(chunks);
  console.log(`Generated ${chunks.length} chunks`);
}

function pathToPattern(input: string) {
  if (existsSync(input)) {
    const status = statSync(input);
    if (status.isDirectory()) {
      return `${input}${input.endsWith("/") ? "" : "/"}**/*.md`;
    }
  }

  return input;
}
