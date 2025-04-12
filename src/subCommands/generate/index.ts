import { generateDocumentChunks } from "../../lib/generator";
import { writeChunks } from "../../lib/files";

export async function generate(pattern: string) {
  process.stdout.write(`Embedding...\r`);

  const chunks = await generateDocumentChunks({
    cacheDir: './,cache',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    pattern: '../rad/front/docs/**/*.md',
    onEmbedProgress: (index, length) => {
      process.stdout.write(`Embedding ${index} / ${length} (${((index / length) * 100).toFixed(2)}%)\r`);
    },
  });

  process.stdout.write(`\n`);

  writeChunks(chunks);
  console.log(`Generated ${chunks.length} chunks`);
}
