import { ContentChunk, VectoredChunk } from "../search";
import { cacheEmbedding, readEmbeddingCache } from "../cache";
import { postTextEmbedding } from "../openAi";

export interface ChunkProcessorConfig {
  onReadProgress?: (index: number, length: number) => void;
  onEmbedProgress?: (index: number, length: number) => void;
  OPENAI_API_KEY: string;
}

/**
 * Processes an array of ContentChunks, checks cache, generates embeddings for missing ones,
 * and returns an array of VectoredChunks.
 */
export async function processChunksWithEmbedding(
  chunks: ContentChunk[],
  config: ChunkProcessorConfig,
): Promise<VectoredChunk[]> {
  const chunksToEmbed: ContentChunk[] = [];
  const vectoredChunks: VectoredChunk[] = [];

  // Step 1: Check cache for each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const cachedVector = readEmbeddingCache(chunk.content);

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

    // Report reading progress (cache checking phase)
    config.onReadProgress?.(i + 1, chunks.length);
  }

  // Step 2: Generate embeddings for chunks without cache
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
    cacheEmbedding(chunk.content, vector);

    // Report embedding progress
    config.onEmbedProgress?.(i + 1, chunksToEmbed.length);
  }

  return vectoredChunks;
}
