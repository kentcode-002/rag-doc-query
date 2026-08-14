import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { embedText } from "@/lib/embeddings";
import { searchChunks, hasDocument } from "@/lib/store";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { question, history } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "No question provided" },
        { status: 400 }
      );
    }

    if (!(await hasDocument())) {
      return NextResponse.json(
        { error: "Please upload a document first" },
        { status: 400 }
      );
    }

    const questionEmbedding = await embedText(question);
    const relevantChunks = await searchChunks(questionEmbedding, 15);

    const context = relevantChunks.join("\n\n---\n\n");

    const conversationText = (history || [])
      .map(
        (m: { role: string; content: string }) =>
          `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
      )
      .join("\n");

    const prompt = `You are a helpful assistant answering questions about a document.
    Use the document context below to answer questions. If something isn't in the context, say so honestly - don't make things up.
    
    You also have the conversation so far. Use it to understand follow-up requests - for example, if the user asks you to shorten, expand, rephrase, or clarify your previous answer, do that using the conversation history, not just the document context.
    
    Document context:
    ${context}
    
    Conversation so far:
    ${conversationText || "(this is the first message)"}
    
    New question: ${question}
    
    Answer:`;

    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: prompt,
    });

    return NextResponse.json({ answer: interaction.output_text });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong answering your question" },
      { status: 500 }
    );
  }
}
