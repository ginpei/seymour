import { glob } from "fast-glob";
import MarkdownIt from "markdown-it";
import { readFileSync } from "node:fs";
import { ContentChunk, VectoredChunk } from "../search";
import { processChunksWithEmbedding } from "./chunkProcessor";
import { ReaderConfig } from "./ReaderConfig";

const md = new MarkdownIt();

/**
 * @example
 * const chunks = await generateMarkdownChunks({
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
export async function generateMarkdownChunks(config: ReaderConfig): Promise<VectoredChunk[]> {
  // Step 1: Read all markdown files and create chunks
  const chunks = await readMarkdowns(config.pattern);

  // Step 2: Process chunks using the common processor
  const vectoredChunks = await processChunksWithEmbedding(chunks, config);

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
