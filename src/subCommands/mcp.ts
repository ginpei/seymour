import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readAllChunks } from "../lib/chunkManager";
import { findTopMatches, postTextEmbedding, VectoredChunk } from "../lib/llm";

// Define the input schema for the recommendFiles tool
const recommendFilesArgs = {
  query: z.string().describe("The natural language query to search for."),
};

/**
 * Starts the MCP server.
 */
export async function mcpSubCommand() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
  if (!OPENAI_API_KEY) {
    console.error("[@ginpei/seymour] \x1b[31mError: OPENAI_API_KEY is not set.\x1b[0m");
    process.exit(1);
  }

  const server = new McpServer({
    name: "seymour-mcp",
    version: "0.1.0", // Consider linking this to package.json version
  });

  server.tool(
    "suggestFileToSearch",
    "Suggests relevant files to search for information in the codebase.",
    recommendFilesArgs,
    async (req) => {
      const { query } = req;

      let chunks: VectoredChunk[];
      try {
        chunks = readAllChunks();
        if (chunks.length === 0) {
          console.error("[@ginpei/seymour] No chunks found. Please run the 'read' command first.");
          // Return an empty list or an error message? Returning empty for now.
          return { content: [{ type: "text", text: "[]" }] };
        }
      } catch (error) {
        console.error("[@ginpei/seymour] Error reading chunks:", error);
        // How to best report errors via MCP? Sending a text message for now.
        return {
          content: [
            { type: "text", text: `Error reading chunks: ${error}` },
          ],
        };
      }

      try {
        const embeddingQuery = `About: ${query}`;
        const vector = await postTextEmbedding(embeddingQuery, OPENAI_API_KEY);

        const topMatches = findTopMatches(chunks, vector, 5);

        const filePaths = topMatches.map((match) => match.filePath);

        // Return the file paths as a JSON string array
        return {
          content: [{ type: "text", text: JSON.stringify(filePaths) }],
        };
      } catch (error) {
        console.error("[@ginpei/seymour] Error processing suggestFileToSearch request:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error processing request: ${error}`,
            },
          ],
        };
      }
    },
  );

  // Connect the server using stdio transport
  const transport = new StdioServerTransport();
  server.connect(transport);

}
