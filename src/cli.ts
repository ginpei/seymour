#!/usr/bin/env node
import { Command } from "commander";
import dotenv from "dotenv";
import { read } from "./subCommands/read";
import { search } from "./subCommands/search";
import { sourceSubCommand } from "./subCommands/source";
import { mcpSubCommand } from "./subCommands/mcp";

dotenv.config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
main();

function main() {
  if (!OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY is not set in .env file");
    process.exit(1);
  }

  const program = new Command();

  program
    .name("seymour")
    .description("Semantic search over local Markdown docs")
    .version("0.1.0");

  program
    .command("read")
    .argument("<type>", "Document type to process (md, ts)")
    .argument("<pattern>", "Glob pattern to match files")
    .description("Generate chunks and embeddings from files")
    .action(read);

  program
    .command("search")
    .argument("<query>", "Natural language query")
    .description("Search chunks using semantic similarity")
    .action((query) => search(query, OPENAI_API_KEY));

  program
    .command("source")
    .description("List all sources that have been read")
    .action(sourceSubCommand);

  program
    .command("mcp")
    .description("Start the MCP server for AI agent interaction")
    .action(mcpSubCommand);

  program.parse();
}
