import dotenv from "dotenv";
import { existsSync } from "fs";
import { findTopMatches, postTextEmbedding, VectoredChunks } from "./llm";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

main();

async function main() {
  const args = process.argv.slice(2);
  const question = args.join(' ').trim();

  if (OPENAI_API_KEY === '' || question === '') {
    printUsage();
    return;
  }

  const chunks = readChunks();

  console.log(`Embedding your question...`);
  const vector = await postTextEmbedding(question, OPENAI_API_KEY);

  const startedAt = Date.now();
  const topMatches = findTopMatches(chunks, vector, 5);
  const elapsed = Date.now() - startedAt;

  console.log(`Top matches (${elapsed}ms):`, topMatches.map((v) => `${v.content} (${v.filePath})`));
}

/**
 * Prints usage instructions to the console
 */
function printUsage() {
  console.log('Usage: $ OPENAI_API_KEY=xxx seymour <question>');
}

function readChunks(): VectoredChunks[] {
  if (existsSync('../,chunks.json')) {
    throw new Error('Generate ,chunks.json first');
  }
  const chunks = require('../,chunks.json');
  return chunks;
}
