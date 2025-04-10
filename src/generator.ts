import { glob } from 'fast-glob';
import MarkdownIt from 'markdown-it';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export interface GeneratorConfig {
  cacheDir?: string;
  onEmbedProgress?: (index: number, length: number) => void;
  OPENAI_API_KEY: string;
  pattern: string;
}

interface MarkdownChunk {
  filePath: string;
  header: string;
  content: string;
  charCount: number;
}

interface VectoredChunks extends MarkdownChunk {
  vector: number[];
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
    const vector = readEmbeddingCache(chunk.content, config) ?? await embedText(chunk.content, config);
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

async function embedText(input: string, config: GeneratorConfig): Promise<number[]> {
  const API_URL = 'https://api.openai.com/v1/embeddings';
  const MODEL = 'text-embedding-3-small';

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      model: MODEL,
    }),
  });

  if (!res.ok) {
    console.error(res);
    throw new Error(`Failed to fetch embedding: ${res.status} ${res.statusText}`);
  }

  const result = await res.json() as {
    data: [{
      embedding: number[];
    }]
  };
  const vector = result.data[0].embedding;
  return vector;
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
