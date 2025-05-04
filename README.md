# Seymour

A simple CLI tool for semantic search over local Markdown documentation using OpenAI embeddings.

---

## Features

- 🧠 Natural language search over Markdown documents
- ✂️ Heading-based chunking of `.md` files
- 🌲 Code-aware chunking for `.ts` files (functions, classes, interfaces, etc.)
- 🔍 Cosine similarity-based ranking
- 📁 Outputs data per source into `.seymour/chunks/<id>/` directories (including `chunks.json` and `meta.json`)
- ⚙️ Runs fully locally (except for embedding API)
- 🔌 Exposes search functionality via Model Context Protocol (MCP)

---

## Installation

```bash
# Global installation
npm install -g @ginpei/seymour

# Or install as a development dependency
npm install -D @ginpei/seymour
```

Requires:

- Node.js 18+
- An OpenAI API key

---

## Usage

### 1. Generate chunk and embedding data

**For Markdown:**

```bash
npx @ginpei/seymour read md "./docs/**/*.md"
```

- Recursively scans for `.md` files based on the provided pattern or directory.
- Splits content at headings (`#`, `##`, etc.).
- Uses OpenAI `text-embedding-3-small` to embed each chunk.
- Outputs metadata and chunk data to a dedicated directory under `.seymour/chunks/`.

**For TypeScript:**

```bash
npx @ginpei/seymour read ts "./src/**/*.ts"
```

- Recursively scans for `.ts` and `.tsx` files based on the provided pattern or directory.
- Splits code into logical chunks (functions, classes, interfaces, etc.).
- Uses OpenAI `text-embedding-3-small` to embed each chunk.
- Outputs metadata and chunk data to a dedicated directory under `.seymour/chunks/`.

### 2. Search with a natural language query

```bash
npx @ginpei/seymour search "How to initialize the Foo component"
```

- Embeds your query.
- Compares it to all chunks from all generated sources using cosine similarity.
- Returns the top 5 matching chunks.

### 3. List and manage sources

```bash
npx @ginpei/seymour source
```

- Lists all the sources (chunk sets) that have been generated using the `read` command.
- Allows you to select and delete specific sources if they are no longer needed.

### 4. Run as an MCP Server

To connect an MCP client (e.g., a VS Code extension) to this server, you need to configure how the client should run the server, which is by `npx @ginpei/seymour mcp` command. Here's an example configuration file (`.mcp.json` or similar, depending on the client):

```json
{
  "mcpServers": {
    "ginpei-seymour": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "@ginpei/seymour",
        "mcp"
      ],
      "env": {
        "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY_HERE"
      }
    }
  }
}
```

- Replace `"YOUR_OPENAI_API_KEY_HERE"` with your actual OpenAI API key.

#### Example MCP Method for AI Agents

AI agents interacting with this MCP server can use methods like `suggestFileToSearch`. It's recommended to use this method first when searching for information in the codebase:

```
Always use mcp__ginpei-seymour__suggestFileToSearch first when searching for information in the codebase.
```

---

## Output Example (Search)

When using the `search` command, the output might look like this:

```
Embedding your question... About: How to initialize the Foo component
Top matches (15 ms/123 chunks): [
  'docs/foo.md (0.91)',
  'docs/setup.md (0.88)',
  'src/components/Foo.ts (0.85)',
  'docs/examples.md (0.82)',
  'src/utils/init.ts (0.80)'
]
```

*(Note: The exact format and similarity scores may vary)*

---

## Configuration

Set your OpenAI API key as an environment variable:

```bash
export OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
```

Or use a `.env` file in your project root:

```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
```

---

## License

UNLICENSED
