/**
 * Server-side wrapper around z-ai-web-dev-sdk.
 *
 * This module is the single integration point between Legion Hutta
 * and the LLM. All AI features funnel through here so we can swap
 * providers / models in one place.
 *
 * IMPORTANT: This file MUST be imported only from server contexts
 * (Next.js API routes, server actions). Never import from client
 * components — that would leak API keys to the browser.
 */

import "server-only";
import ZAI from "z-ai-web-dev-sdk";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  /** Optional model override. */
  model?: string;
  /** Enable thinking mode if supported. */
  thinking?: "enabled" | "disabled";
  /** Extra params forwarded to the SDK. */
  extra?: Record<string, unknown>;
}

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getClient() {
  if (!_zai) {
    _zai = await ZAI.create();
  }
  return _zai;
}

/**
 * Run a single non-streaming chat completion. Returns the assistant
 * message text.
 */
export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  const client = await getClient();
  const completion = await client.chat.completions.create({
    messages,
    thinking: { type: opts.thinking ?? "disabled" },
    ...(opts.model ? { model: opts.model } : {}),
    ...(opts.extra ?? {}),
  } as Parameters<typeof client.chat.completions.create>[0]);
  return completion?.choices?.[0]?.message?.content ?? "";
}

/**
 * Run a streaming chat completion. Yields text chunks as they arrive.
 *
 * The z-ai-web-dev-sdk returns the raw `response.body` ReadableStream
 * when `stream: true` is set. We parse it as SSE-formatted chunks
 * (data: {...}) and yield the `delta.content` from each.
 */
export async function* chatStream(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): AsyncGenerator<string> {
  const client = await getClient();
  const result = await client.chat.completions.create({
    messages,
    stream: true,
    thinking: { type: opts.thinking ?? "disabled" },
    ...(opts.model ? { model: opts.model } : {}),
    ...(opts.extra ?? {}),
  } as Parameters<typeof client.chat.completions.create>[0]);

  // The SDK returns response.body (a ReadableStream) when stream=true.
  // It's typed as `any` so we handle both shapes defensively.
  if (result && typeof (result as ReadableStream<unknown>).getReader === "function") {
    const reader = (result as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE events are separated by blank lines
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        for (const line of rawEvent.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const text = parsed?.choices?.[0]?.delta?.content;
            if (text) yield text;
          } catch {
            // ignore malformed event
          }
        }
      }
    }
    return;
  }
  // Fallback: non-streaming response — yield the whole content at once.
  const text = (result as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content;
  if (text) yield text;
}

/**
 * Build a system prompt for an AI assistant that helps with notebooks.
 * Used by the assistant panel, the explain/fix/generate routes, and
 * the `%%ai` magic (via the raw route).
 */
export const NOTEBOOK_ASSISTANT_SYSTEM = `You are the Legion Hutta AI assistant, integrated into a modern, language-agnostic notebook by Death Legion Team.

Your role:
- Help users write, debug, and explain Python code (and other languages soon).
- When the user asks you to "explain" code, give a clear, structured explanation.
- When the user asks you to "fix" an error, propose a corrected code block in a fenced \`\`\`python block.
- When the user asks you to "generate" cells, output one or more fenced code blocks; each block becomes a new cell.
- Be concise. Use markdown sparingly. Show code in fenced blocks with language hints.
- If the user gives you notebook context (variables, prior outputs), use it.
- Never apologize. Never mention you are an AI. Just help.

Stylistic preferences:
- Prefer standard library over third-party packages unless asked.
- Use type hints when generating Python.
- Keep cells short and focused — one idea per cell.`;
