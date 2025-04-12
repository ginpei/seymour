# Seymour

A simple CLI tool for semantic search over local Markdown documentation using OpenAI embeddings.

---

## Features

- 🧠 Natural language search over Markdown documents  
- ✂️ Heading-based chunking of `.md` files  
- 🔍 Cosine similarity-based ranking  
- 📁 Outputs all data in a single `chunks.json` file  
- ⚙️ Runs fully locally (except for embedding API)

---

## Installation

```bash
npm install -g @ginpei/seymour
```

Requires:

- Node.js 18+
- An OpenAI API key

---

## Usage

### 1. Generate chunk and embedding data

```bash
seymour generate "./docs/**/*.md"
```

- Recursively scans for `.md` files  
- Splits content at headings (`#`, `##`, etc.)  
- Uses OpenAI `text-embedding-3-small` to embed each chunk  
- Outputs to `chunks.json`

### 2. Search with a natural language query

```bash
seymour search "How to initialize the Foo component"
```

- Embeds your query  
- Compares it to all chunks using cosine similarity  
- Returns the top 5 matching chunks

---

## Output Example

```
#1 [0.912] How to use Foo (docs/foo.md)
The Foo component must be initialized using...

#2 [0.881] Initialization overview (docs/setup.md)
Before using any component...
```

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

## Output: `chunks.json` format

```json
[
  {
    "id": "uuid-123",
    "filePath": "docs/foo.md",
    "header": "How to use Foo",
    "content": "The Foo component must be...",
    "charCount": 128,
    "vector": [0.001, -0.234, ...]
  }
]
```

---

## License

None
