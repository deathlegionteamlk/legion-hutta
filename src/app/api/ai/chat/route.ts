/**
 * POST /api/ai/chat
 *
 * Streaming chat completion for the AI Assistant side panel.
 *
 * Request body: { messages, context?, model? }
 *   - messages: full conversation history (system / user / assistant)
 *   - context:  optional notebook context (variables, recent cells)
 *
 * Response: text/plain stream (chunked). Each chunk is a UTF-8 text
 * delta. Errors are emitted as a final chunk starting with "ERROR:".
 *
 * The frontend reads this with fetch() + ReadableStream and appends
 * deltas to the conversation.
 */

import { NextRequest } from "next/server";
import { chatStream, NOTEBOOK_ASSISTANT_SYSTEM, type ChatMessage } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  messages: ChatMessage[];
  context?: string;
  model?: string;
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response("Missing 'messages'", { status: 400 });
  }

  // If the caller didn't include a system message, prepend ours.
  const messages: ChatMessage[] = [...body.messages];
  if (!messages.some((m) => m.role === "system")) {
    const sys = body.context
      ? `${NOTEBOOK_ASSISTANT_SYSTEM}\n\nNotebook context (JSON):\n${body.context}`
      : NOTEBOOK_ASSISTANT_SYSTEM;
    messages.unshift({ role: "system", content: sys });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chatStream(messages, body.model ? { model: body.model } : {})) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI stream failed";
        controller.enqueue(encoder.encode(`\n\n[ERROR: ${message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
