/**
 * Requests OpenAI API to get text embedding for the given input string
 * @see https://platform.openai.com/docs/guides/embeddings
 */
export async function postTextEmbedding(
  input: string,
  apiKey: string,
): Promise<number[]> {
  const API_URL = "https://api.openai.com/v1/embeddings";
  const MODEL = "text-embedding-3-small";

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
      model: MODEL,
    }),
  });

  if (!res.ok) {
    console.error(res);
    throw new Error(
      `Failed to fetch embedding: ${res.status} ${res.statusText}`,
    );
  }

  // find response type in the OpenAI API documentation:
  // https://platform.openai.com/docs/api-reference/embeddings
  const result = (await res.json()) as {
    data: [
      {
        embedding: number[];
      },
    ];
  };
  const vector = result.data[0].embedding;

  return vector;
}
