import { existsSync, statSync } from "node:fs";
import { writeChunks } from "../lib/files";
import { generateMarkdownChunks } from "../lib/markdownReader";

export async function read(type: string, pathOrPattern: string) {
  // Handle different document types
  switch (type.toLowerCase()) {
    case "md":
      await readMarkdownFiles(pathOrPattern);
      break;
    case "ts":
      await readTypeScriptFiles(pathOrPattern);
      break;
    default:
      console.error(`\x1b[31mError: Unknown document type '${type}'\x1b[0m`);
      console.error("Supported types: md, ts");
      process.exit(1);
  }
}

/**
 * Process Markdown files and generate chunks with embeddings
 */
async function readMarkdownFiles(pathOrPattern: string) {
  const pattern = pathToMarkdownPattern(pathOrPattern);

  const chunks = await generateMarkdownChunks({
    cacheDir: "./cache",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    pattern,
    onEmbedProgress: (index: number, length: number) => {
      const percent = ((index / length) * 100).toFixed(2);
      process.stdout.write("\r\x1b[K"); // clear line
      process.stdout.write(`Embedding ${index} / ${length} (${percent}%)`); // without newline
      if (index === length) {
        process.stdout.write(`\n`);
      }
    },
  });

  writeChunks(chunks);
  console.log(`Generated ${chunks.length} chunks`);
}

/**
 * Process TypeScript files - currently just a placeholder
 */
async function readTypeScriptFiles(pathOrPattern: string) {
  console.log("Hello world from TypeScript reader!");
  console.log(`Pattern received: ${pathOrPattern}`);
  console.log("TypeScript support is coming soon...");
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
