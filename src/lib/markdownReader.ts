import { glob } from "fast-glob";
import MarkdownIt from "markdown-it";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { postTextEmbedding, ContentChunk, VectoredChunk } from "./llm";

export interface MarkdownReaderConfig {
  cacheDir?: string;
  onReadProgress?: (index: number, length: number) => void;
  onEmbedProgress?: (index: number, length: number) => void;
  OPENAI_API_KEY: string;
  pattern: string;
}

const md = new MarkdownIt();

/**
 * @example
 * const chunks = await generateMarkdownChunks({
 *   cacheDir: './cache',
 *   OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
 *   pattern: './docs/**\/*.md',
 *   onReadProgress: (index, length) => {
 *     console.log(`Reading ${index} / ${length} (${((index / length) * 100).toFixed(2)}%)`);
 *   },
 *   onEmbedProgress: (index, length) => {
 *     console.log(`Embedding ${index} / ${length} (${((index / length) * 100).toFixed(2)}%)`);
 *   },
 * });
 *
 * writeFileSync('chunks.json', JSON.stringify(chunks, null, 2));
 * console.log(`Generated ${chunks.length} chunks`);
 */
export async function generateMarkdownChunks(config: MarkdownReaderConfig) {
  // Step 1: Read all markdown files and create chunks
  const chunks = await readMarkdowns(config.pattern);
  
  // Step 2: Check cache for each chunk and identify which ones need embedding
  const chunksToEmbed: ContentChunk[] = [];
  const vectoredChunks: VectoredChunk[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const cachedVector = readEmbeddingCache(chunk.content, config);
    
    if (cachedVector) {
      // Add to vectored chunks if cache exists
      vectoredChunks.push({
        ...chunk,
        vector: cachedVector,
      });
    } else {
      // Add to the list that needs embedding
      chunksToEmbed.push(chunk);
    }
    
    // Report reading progress
    config.onReadProgress?.(i + 1, chunks.length);
  }
  
  // Step 3: Generate embeddings for chunks without cache
  if (chunksToEmbed.length === 0) {
    config.onEmbedProgress?.(0, 0);
  }
  for (let i = 0; i < chunksToEmbed.length; i++) {
    const chunk = chunksToEmbed[i];
    const vector = await postTextEmbedding(chunk.content, config.OPENAI_API_KEY);
    
    // Add to result
    vectoredChunks.push({
      ...chunk,
      vector,
    });
    
    // Cache the embedding
    cacheEmbedding(chunk.content, vector, config);
    
    // Report embedding progress
    config.onEmbedProgress?.(i + 1, chunksToEmbed.length);
  }
  
  return vectoredChunks;
}

async function readMarkdowns(pattern: string): Promise<ContentChunk[]> {
  const paths = await glob(pattern);

  const chunks = (
    await Promise.all(
      paths.map(async (file) => {
        const content = readFileSync(file, "utf-8");
        const chunk = chunkMarkdown(content, file);
        return chunk;
      }),
    )
  ).flat();

  return chunks;
}

/**
 * Split Markdown content into chunks starting at each heading (#, ##, ###, etc.)
 */
function chunkMarkdown(body: string, filePath: string): ContentChunk[] {
  const tokens = md.parse(body, {});
  const chunks: ContentChunk[] = [];

  let currentChunk = "";
  let currentHeader = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "heading_open") {
      // チャンクを保存（見出しの直前までが currentChunk）
      if (currentChunk.trim()) {
        chunks.push({
          filePath,
          header: currentHeader,
          content: currentChunk.trim(),
          charCount: currentChunk.length,
        });
        currentChunk = "";
      }

      // The next token is the heading text (inline)
      const inlineToken = tokens[i + 1];
      if (inlineToken?.type === "inline") {
        currentHeader = inlineToken.content;
      }
    }

    // Skip heading_close (do not put in content)
    if (token.type !== "heading_close") {
      currentChunk += token.content || "";
    }
  }

  // Last chunk
  if (currentChunk.trim()) {
    chunks.push({
      filePath,
      header: currentHeader,
      content: currentChunk.trim(),
      charCount: currentChunk.length,
    });
  }

  return chunks;
}

function cacheEmbedding(
  content: string,
  vector: number[],
  config: MarkdownReaderConfig,
) {
  if (!config.cacheDir) {
    return;
  }

  const hash = createHash("sha256");
  hash.update(content);
  const hex = hash.digest("hex");

  const cachePath = `${config.cacheDir}/${hex}`;
  mkdirSync(config.cacheDir, { recursive: true });
  writeFileSync(cachePath, JSON.stringify(vector));
}

function readEmbeddingCache(
  content: string,
  config: MarkdownReaderConfig,
): number[] | null {
  if (!config.cacheDir) {
    return null;
  }

  const hash = createHash("sha256");
  hash.update(content);
  const hex = hash.digest("hex");

  const cachePath = `${config.cacheDir}/${hex}`;
  try {
    const vector = readFileSync(cachePath, "utf-8");
    return JSON.parse(vector);
  } catch (e) {
    return null;
  }
}
