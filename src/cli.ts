#!/usr/bin/env node
import { Command } from "commander";
import dotenv from "dotenv";
import { generate } from "./subCommands/generate";
import { search } from "./subCommands/search";

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
    .command("generate")
    .argument("<pattern>", "Glob pattern to match markdown files")
    .description("Generate chunks and embeddings from markdown files")
    .action(generate);

  program
    .command("search")
    .argument("<query>", "Natural language query")
    .description("Search chunks using semantic similarity")
    .action((query) => search(query, OPENAI_API_KEY));

  program.parse();
}
