import { existsSync, statSync } from "node:fs";
import {
  calculateChunkSetId,
  writeChunksFile,
  writeMetaFile,
} from "../lib/chunkManager";
import { generateMarkdownChunks } from "../lib/markdownReader";
import { generateTypeScriptChunks } from "../lib/typescriptReader";

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
  const type = "md";
  const id = calculateChunkSetId(type, pattern);

  const chunks = await generateMarkdownChunks({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    pattern,
    onReadProgress: (index: number, length: number) => {
      const percent = ((index / length) * 100).toFixed(2);
      process.stdout.write("\r\x1b[K"); // clear line
      process.stdout.write(`Reading ${index} / ${length} (${percent}%)`); // without newline
      if (index === length) {
        process.stdout.write(`\n`);
      }
    },
    onEmbedProgress: (index: number, length: number) => {
      if (length === 0) {
        process.stdout.write(`Embedding 0 / 0\n`);
        return;
      }

      const percent = ((index / length) * 100).toFixed(2);
      process.stdout.write("\r\x1b[K"); // clear line
      process.stdout.write(`Embedding ${index} / ${length} (${percent}%)`); // without newline
      if (index === length) {
        process.stdout.write(`\n`);
      }
    },
  });

  writeMetaFile(id, { id, type, pattern });
  writeChunksFile(id, chunks);
  console.log(
    `Generated ${chunks.length} chunks for ${type} pattern "${pattern}" (ID: ${id})`,
  );
}

/**
 * Process TypeScript files and generate chunks with embeddings
 */
async function readTypeScriptFiles(pathOrPattern: string) {
  const pattern = pathToTypeScriptPattern(pathOrPattern);
  const type = "ts";
  const id = calculateChunkSetId(type, pattern);

  const chunks = await generateTypeScriptChunks({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    pattern,
    onReadProgress: (index: number, length: number) => {
      const percent = ((index / length) * 100).toFixed(2);
      process.stdout.write("\r\x1b[K"); // clear line
      process.stdout.write(`Reading ${index} / ${length} (${percent}%)`); // without newline
      if (index === length) {
        process.stdout.write(`\n`);
      }
    },
    onEmbedProgress: (index: number, length: number) => {
      const percent = ((index / length) * 100).toFixed(2);
      process.stdout.write("\r\x1b[K"); // clear line
      process.stdout.write(`Embedding ${index} / ${length} (${percent}%)`); // without newline
      if (index === length) {
        process.stdout.write(`\n`);
      }
    },
  });

  writeMetaFile(id, { id, type, pattern });
  writeChunksFile(id, chunks);
  console.log(
    `Generated ${chunks.length} chunks for ${type} pattern "${pattern}" (ID: ${id})`,
  );
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

/**
 * Convert a path to a pattern for matching TypeScript files.
 * If the input is a directory, append wildcard pattern to match all TypeScript files.
 * Otherwise, return the input as is.
 */
function pathToTypeScriptPattern(input: string) {
  if (existsSync(input)) {
    const status = statSync(input);
    if (status.isDirectory()) {
      return `${input}${input.endsWith("/") ? "" : "/"}**/*.{ts,tsx}`;
    }
  }

  return input;
}
