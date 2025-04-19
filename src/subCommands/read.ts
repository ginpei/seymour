import { existsSync, statSync } from "node:fs";
import { writeChunks } from "../lib/files";
import { generateMarkdownChunks } from "../lib/markdownReader";

export async function read(pathOrPattern: string) {
  const pattern = pathToMarkdownPattern(pathOrPattern);

  const chunks = await generateMarkdownChunks({
    cacheDir: "./cache",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    pattern,
    onEmbedProgress: (index, length) => {
      const percent = ((index / length) * 100).toFixed(2);
      process.stdout.write(`Embedding ${index} / ${length} (${percent}%)\r`);
      if (index === length) {
        process.stdout.write(`\n`);
      }
    },
  });

  writeChunks(chunks);
  console.log(`Generated ${chunks.length} chunks`);
}

/**
 * Convert a path to a pattern for matching Markdown files.
 * If the input is a directory, append wildcard pattern to match all Markdown files.
 * Otherwise, return the input as is.
 */
function pathToMarkdownPattern(input: string) {
  if (existsSync(input)) {
    const status = statSync(input);
    if (status.isDirectory()) {
      return `${input}${input.endsWith("/") ? "" : "/"}**/*.md`;
    }
  }

  return input;
}
