"use client";

import ReactMarkdown from "react-markdown";
import { useState, useRef } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<"app" | "about">("app");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docReady, setDocReady] = useState(false);
  const [docName, setDocName] = useState("");
  const [chunkCount, setChunkCount] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_FILE_SIZE_MB = 4;

  function validateAndSetFile(selected: File | null) {
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setUploadError(
        `File is too large (${(selected.size / 1024 / 1024).toFixed(
          1
        )}MB). Max size is ${MAX_FILE_SIZE_MB}MB.`
      );
      setFile(null);
      return;
    }
    setUploadError("");
    setFile(selected);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.status === 413) {
        setUploadError(
          `File is too large. Please upload a PDF under ${MAX_FILE_SIZE_MB}MB.`
        );
        setDocReady(false);
        return;
      }

      let data;
      try {
        data = await res.json();
      } catch {
        setUploadError(
          `Upload failed - the file may be too large (max ${MAX_FILE_SIZE_MB}MB) or something went wrong on the server.`
        );
        setDocReady(false);
        return;
      }

      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        setDocReady(false);
      } else {
        setDocReady(true);
        setDocName(data.fileName);
        setChunkCount(data.chunkCount);
        setMessages([]);
      }
    } catch {
      setUploadError("Network error — is the server running?");
    } finally {
      setUploading(false);
    }
  }

  async function handleAsk() {
    if (!question.trim()) return;

    const userMessage: Message = { role: "user", content: question };
    const recentHistory = messages.slice(-8);
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setAsking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage.content,
          history: recentHistory,
        }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.ok ? data.answer : `Error: ${data.error}`,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again." },
      ]);
    } finally {
      setAsking(false);
    }
  }

  const CHUNK_DISPLAY_CAP = 24;

  return (
    <main className="max-w-2xl mx-auto px-5 py-14">
      {/* Header */}
      <div className="flex items-baseline gap-2.5 mb-1">
        <span className="w-2 h-2 rounded-full bg-accent" />
        <h1 className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
          DocQuery
        </h1>
      </div>
      <h2 className="font-display italic text-3xl text-ink mb-6 leading-snug">
        Ask your assistant a question.
      </h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-edge">
        <button
          onClick={() => setActiveTab("app")}
          className={`px-3 py-2 text-sm font-mono transition-colors border-b-2 -mb-px ${
            activeTab === "app"
              ? "border-accent text-ink"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          App
        </button>
        <button
          onClick={() => setActiveTab("about")}
          className={`px-3 py-2 text-sm font-mono transition-colors border-b-2 -mb-px ${
            activeTab === "about"
              ? "border-accent text-ink"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          About & Limitations
        </button>
      </div>

      {activeTab === "about" ? (
        <AboutPanel />
      ) : (
        <>
          {/* Upload zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              validateAndSetFile(e.dataTransfer.files?.[0] || null);
            }}
            className={`relative border rounded-md p-5 mb-8 transition-colors ${
              dragActive
                ? "border-accent bg-surface2"
                : "border-edge bg-surface"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => validateAndSetFile(e.target.files?.[0] || null)}
              className="hidden"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm px-3 py-1.5 rounded border border-edge bg-surface2 hover:border-accent hover:text-accent-bright transition-colors font-mono"
              >
                Choose file
              </button>
              <span className="text-sm text-muted font-mono truncate">
                {file
                  ? `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`
                  : "no file selected"}
              </span>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="ml-auto text-sm px-4 py-1.5 rounded bg-accent hover:bg-accent-bright disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {uploading ? "Processing…" : "Upload"}
              </button>
            </div>

            <p className="text-xs text-muted font-mono mt-2">
              PDF only · max {MAX_FILE_SIZE_MB}MB
            </p>

            {uploadError && (
              <p className="mt-3 text-sm text-accent-bright border-l-2 border-accent-bright pl-2.5">
                {uploadError}
              </p>
            )}

            {docReady && (
              <div className="mt-4 flex items-start gap-3">
                <span className="shrink-0 font-mono text-[10px] tracking-widest uppercase border-2 border-accent-bright text-accent-bright px-2 py-1 rounded -rotate-3 animate-stampIn">
                  Ready
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-ink font-mono truncate">
                    {docName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {Array.from({
                      length: Math.min(chunkCount, CHUNK_DISPLAY_CAP),
                    }).map((_, i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-[1px] bg-accent"
                      />
                    ))}
                    {chunkCount > CHUNK_DISPLAY_CAP && (
                      <span className="text-xs text-muted font-mono ml-1">
                        +{chunkCount - CHUNK_DISPLAY_CAP} more
                      </span>
                    )}
                    <span className="text-xs text-muted font-mono ml-2">
                      {chunkCount} chunk{chunkCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          {messages.length === 0 && docReady && (
            <p className="text-sm text-muted mb-4">
              Document indexed. Ask something below to see it answer from the
              source.
            </p>
          )}

          <div className="space-y-3 mb-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`animate-riseIn p-3.5 rounded-md text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-surface2 border-l-2 border-accent ml-10"
                    : "bg-surface border border-edge mr-10"
                }`}
              >
                <span className="block font-mono text-[10px] tracking-widest uppercase text-muted mb-1.5">
                  {m.role === "user" ? "You" : "Assistant"}
                </span>
                {m.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            ))}
            {asking && (
              <div className="p-3.5 rounded-md text-sm bg-surface border border-edge mr-10 text-muted font-mono">
                thinking…
              </div>
            )}
          </div>

          {/* Question input */}
          <div className="flex gap-2 sticky bottom-6">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !asking && handleAsk()}
              disabled={!docReady}
              placeholder={
                docReady
                  ? "Ask something about the document…"
                  : "Upload a PDF first"
              }
              className="flex-1 bg-surface border border-edge rounded-md px-3.5 py-2.5 text-sm placeholder:text-muted/60 disabled:opacity-40 focus:outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={handleAsk}
              disabled={!docReady || asking || !question.trim()}
              className="px-4 py-2.5 rounded-md bg-accent hover:bg-accent-bright disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              Ask
            </button>
          </div>
        </>
      )}
    </main>
  );
}

function AboutPanel() {
  return (
    <div className="space-y-8 text-sm leading-relaxed">
      <section>
        <h3 className="font-mono text-xs tracking-widest uppercase text-accent-bright mb-2">
          What this is
        </h3>
        <p className="text-ink/90">
          This started as a way to actually understand how RAG
          (Retrieval-Augmented Generation) works, not just read about it. Upload
          a PDF and it gets broken into chunks, each one turned into an
          embedding (basically coordinates in "meaning space"), and stored in a
          database. Ask something, and it finds the chunks closest to the
          question and hands those to Gemini — so the answer comes from the
          actual document instead of the model just guessing.
        </p>
      </section>

      <section>
        <h3 className="font-mono text-xs tracking-widest uppercase text-accent-bright mb-2">
          {/* Things it doesn&apos;t do (yet) */}
          Limitations (For now)
        </h3>
        <ul className="space-y-3">
          <li>
            <span className="font-mono text-muted font-black">
              4MB per file
            </span>{" "}
            — Vercel&apos;s free tier just rejects anything bigger before the
            app even runs. The real fix would be uploading straight to storage
            instead of through the server, which isn&apos;t built yet.
          </li>
          <li>
            <span className="font-mono text-muted font-black">
              One document at a time
            </span>{" "}
            — upload a new PDF and it wipes the old one. Multi-document support
            is on the list.
          </li>
          <li>
            <span className="font-mono text-muted font-black">
              Sometimes misses things in long lists
            </span>{" "}
            — documents get cut into fixed-size pieces, and if a list or heading
            lands right on the seam between two pieces, part of it can get left
            out of what the model sees. It&apos;s not making things up, it just
            genuinely wasn&apos;t handed that piece.
          </li>
          <li>
            <span className="font-mono text-muted font-black">
              Forgets the conversation on refresh
            </span>{" "}
            — it can follow up within one session ("make that shorter" works),
            but that memory only lives in the browser tab. The document itself
            is saved for good, the chat isn&apos;t.
          </li>
          <li>
            <span className="font-mono text-muted font-thin">
              Needs actual text in the PDF
            </span>{" "}
            — scanned pages or photos of documents won&apos;t work, since
            there&apos;s no OCR step to pull text out of an image.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="font-mono text-xs tracking-widest uppercase text-accent-bright mb-2">
          Built with
        </h3>
        <p className="text-ink/90 font-mono text-xs">
          Next.js · Gemini (embeddings + generation) · Supabase / pgvector ·
          Vercel
        </p>
      </section>
    </div>
  );
}
