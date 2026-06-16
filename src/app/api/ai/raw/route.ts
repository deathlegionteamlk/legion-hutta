/**
 * POST /api/ai/raw
 *
 * Non-streaming chat endpoint used by:
 *  - The Python backend's `%%ai` magic (calls this via HTTP)
 *  - The Next.js AI routes that need a one-shot completion
 *
 * Request body: { prompt, system?, model?, context? }
 * Response: { text, model, usage? }
 *
 * Always server-side. No auth — this route is called same-origin
 * from the frontend or from the Python backend (localhost only).
 */

import { NextRequest, NextResponse } from "next/server";
import { chat, NOTEBOOK_ASSISTANT_SYSTEM, type ChatMessage } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RawRequest {
  prompt: string;
  system?: string;
  model?: string;
  context?: string;
}

export async function POST(req: NextRequest) {
  let body: RawRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.prompt || typeof body.prompt !== "string") {
    return NextResponse.json({ error: "Missing 'prompt'" }, { status: 400 });
  }

  const messages: ChatMessage[] = [];
  if (body.context) {
    messages.push({
      role: "system",
      content: `${NOTEBOOK_ASSISTANT_SYSTEM}\n\nNotebook context (JSON):\n${body.context}`,
    });
  } else {
    messages.push({ role: "system", content: body.system ?? NOTEBOOK_ASSISTANT_SYSTEM });
  }
  messages.push({ role: "user", content: body.prompt });

  try {
    const text = await chat(messages, body.model ? { model: body.model } : {});
    return NextResponse.json({ text, model: body.model ?? "default" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
