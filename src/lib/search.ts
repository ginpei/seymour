export interface ContentChunk {
  filePath: string;
  header: string;
  content: string;
  charCount: number;
}

export interface VectoredChunk extends ContentChunk {
  vector: number[];
}

/**
 * Represents a chunk that has been matched against a query vector.
 * Includes the original chunk data and the similarity score.
 */
export interface MatchedChunk extends VectoredChunk {
  similarity: number;
}

/**
 * Finds the top matching chunks based on cosine similarity to the query vector
 */
export function findTopMatches(
  chunks: VectoredChunk[],
  queryVector: number[],
  limit: number = 5,
): MatchedChunk[] {
  const chunkScores: MatchedChunk[] = chunks.map(chunk => ({
    ...chunk,
    similarity: cosineSimilarity(chunk.vector, queryVector),
  }));

  // Sort chunks by similarity in descending order
  chunkScores.sort((a, b) => b.similarity - a.similarity);

  // Return the top N chunks
  return chunkScores.slice(0, limit);
}

/**
 * Returns cosine similarity score between -1.0 and 1.0.
 * - 1.0: perfect match (vectors point in same direction)
 * - 0.0: no relationship (vectors are orthogonal)
 * - -1.0: complete opposition (vectors point in opposite directions)
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
