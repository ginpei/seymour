import { glob } from 'fast-glob';
import MarkdownIt from 'markdown-it';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { postTextEmbedding, MarkdownChunk, VectoredChunks } from './llm';

export interface GeneratorConfig {
  cacheDir?: string;
  onEmbedProgress?: (index: number, length: number) => void;
  OPENAI_API_KEY: string;
  pattern: string;
}

const md = new MarkdownIt();

/**
 * @example
 * const chunks = await generate({
 *   cacheDir: './cache',
 *   OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
 *   pattern: './docs/**\/*.md',
 *   onEmbedProgress: (index, length) => {
 *     console.log(`Embedding ${index} / ${length} (${Math.floor((index / length) * 100)}%)`);
 *   },
 * });
 * 
 * writeFileSync('chunks.json', JSON.stringify(chunks, null, 2));
 * console.log(`Generated ${chunks.length} chunks`);
 */
export async function generate(config: GeneratorConfig) {
  const chunks = await readMarkdowns(config.pattern);

  const vectoredChunks: VectoredChunks[] = [];
  for (const chunk of chunks) {
    const vector = readEmbeddingCache(chunk.content, config) ?? await postTextEmbedding(chunk.content, config.OPENAI_API_KEY);
    vectoredChunks.push({
      ...chunk,
      vector,
    });
    config.onEmbedProgress?.(vectoredChunks.length, chunks.length);

    cacheEmbedding(chunk.content, vector, config);
  }

  return vectoredChunks;
}

async function readMarkdowns(pattern: string): Promise<MarkdownChunk[]> {
  const paths = await glob(pattern);

  const chunks = (await Promise.all(paths.map(async (file) => {
    const content = readFileSync(file, 'utf-8');
    const chunk = chunkMarkdown(content, file);
    return chunk;
  }))).flat();

  return chunks;
}

/**
 * Split Markdown content into chunks starting at each heading (#, ##, ###, etc.)
 */
function chunkMarkdown(body: string, filePath: string): MarkdownChunk[] {
  const tokens = md.parse(body, {});
  const chunks: MarkdownChunk[] = [];

  let currentChunk = '';
  let currentHeader = '';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'heading_open') {
      // チャンクを保存（見出しの直前までが currentChunk）
      if (currentChunk.trim()) {
        chunks.push({
          filePath,
          header: currentHeader,
          content: currentChunk.trim(),
          charCount: currentChunk.length,
        });
        currentChunk = '';
      }

      // The next token is the heading text (inline)
      const inlineToken = tokens[i + 1];
      if (inlineToken?.type === 'inline') {
        currentHeader = inlineToken.content;
      }
    }

    // Skip heading_close (do not put in content)
    if (token.type !== 'heading_close') {
      currentChunk += token.content || '';
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

function cacheEmbedding(content: string, vector: number[], config: GeneratorConfig) {
  if (!config.cacheDir) {
    return;
  }

  const hash = createHash('sha256');
  hash.update(content);
  const hex = hash.digest('hex');

  const cachePath = `${config.cacheDir}/${hex}`;
  mkdirSync(config.cacheDir, { recursive: true });
  writeFileSync(cachePath, JSON.stringify(vector));
}

function readEmbeddingCache(content: string, config: GeneratorConfig): number[] | null {
  if (!config.cacheDir) {
    return null;
  }

  const hash = createHash('sha256');
  hash.update(content);
  const hex = hash.digest('hex');

  const cachePath = `${config.cacheDir}/${hex}`;
  try {
    const vector = readFileSync(cachePath, 'utf-8');
    return JSON.parse(vector);
  } catch (e) {
    return null;
  }
}
