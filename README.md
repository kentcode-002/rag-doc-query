# Doc Chat — RAG-powered PDF Q&A

Upload a PDF, ask questions about it, get answers grounded in the actual document (not hallucinated).

## How it works

1. You upload a PDF → server extracts the text
2. Text gets split into overlapping chunks
3. Each chunk gets converted into a vector (embedding) via Gemini
4. Chunks + vectors are stored in memory
5. When you ask a question, it's also converted into a vector
6. We find the most similar chunks (cosine similarity) and hand only those to the LLM
7. The LLM answers using that context

## Setup (step by step)

### 1. Install dependencies
```bash
npm install
```

### 2. Get a free Gemini API key
Go to https://aistudio.google.com/apikey, sign in with a Google account, click "Create API key". No credit card needed.

### 3. Add your key
Copy the example env file and paste your key in:
```bash
cp .env.local.example .env.local
```
Then open `.env.local` and replace `your_key_here` with your actual key.

### 4. Run it
```bash
npm run dev
```
Open http://localhost:3000 in your browser.

### 5. Try it
Upload any PDF (a resume, a paper, a manual — anything with real text, not a scanned image), then ask it a question.

## Project structure

```
app/
  page.tsx              <- the UI (upload box + chat)
  api/upload/route.ts   <- handles PDF upload, chunking, embedding
  api/chat/route.ts     <- handles questions, retrieval, generation
lib/
  chunking.ts           <- splits text into overlapping pieces
  embeddings.ts         <- calls Gemini to turn text into vectors
  store.ts              <- in-memory vector search (cosine similarity)
```

## Known limitations (intentional, for now)

- **Data resets on server restart** — chunks live in memory, not a database. Fine for a demo; the natural next upgrade is Supabase with pgvector.
- **One document at a time** — uploading a new PDF replaces the old one.
- **Text-based PDFs only** — scanned/image PDFs won't extract text without OCR (a possible future add-on).

## Next steps to level this up further

- Add persistence with Supabase (pgvector) so documents survive restarts
- Stream the LLM response token-by-token instead of waiting for the full answer
- Support multiple documents at once
- Add authentication so each user has their own documents
