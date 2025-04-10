# Semantic Search System for Markdown Documentation

This project implements a local semantic search system for internal documentation written in Markdown.

## Project Scope

The scope is limited to two core parts:

### 1. Preprocessing

- Recursively read all Markdown files in a given directory.
- Split each file into logical content chunks based on headings (e.g. #, ##, ###).
- Generate a unique ID for each chunk.
- Use OpenAI's `text-embedding-3-small` model to compute an embedding vector for each chunk's content.
- Save the results to two JSON files:  
  - `chunks.json` containing metadata and content  
  - `embeddings.json` containing the embedding vectors keyed by chunk ID

### 2. Search Interface

- Accept a natural language query as input (e.g. from CLI or HTTP request).
- Use the same OpenAI embedding model to convert the query into a vector.
- Compare the query vector to all document embeddings using cosine similarity.
- Return the top 5 most relevant chunks, including their IDs and original content.

## Technical Details

- Dataset size: approximately 600 chunks
- Entire system runs locally
- No database required - all processing is done in memory using JSON files
- Implementation in TypeScript with minimal dependencies:
  - axios (HTTP requests to OpenAI API)
  - dotenv (environment variable management)
  - uuid (unique ID generation)
  - Other core utilities as needed