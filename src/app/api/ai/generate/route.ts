/**
 * POST /api/ai/generate
 *
 * Generate one or more cells from a natural-language prompt.
 *
 * Request:  { prompt, context?, language?, count? }
 * Response: { cells: Array<{ kind: "code"|"markdown", source: string }> }
 *
 * The assistant is asked to emit fenced code blocks; each block
 * becomes a code cell. Markdown prose outside the blocks (if any)
 * becomes a markdown cell that precedes the code.
 */

import { NextRequest, NextResponse } from "next/server";
import { chat, NOTEBOOK_ASSISTANT_SYSTEM } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GenerateRequest {
  prompt: string;
  context?: string;
  language?: string;
  count?: number;
}

interface GeneratedCell {
  kind: "code" | "markdown";
  source: string;
}

export async function POST(req: NextRequest) {
  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.prompt) {
    return NextResponse.json({ error: "Missing 'prompt'" }, { status: 400 });
  }

  const lang = body.language ?? "python";
  const prompt = `Generate notebook cells for the following request. Output one or more fenced \`\`\`${lang} code blocks. You may include brief markdown explanations between blocks.

Request: ${body.prompt}

Rules:
- Each fenced code block becomes a code cell.
- Markdown text outside blocks becomes markdown cells.
- Keep cells short and focused.
- Use standard library only unless the request requires a third-party package.`;

  const contextSuffix = body.context
    ? `\n\nNotebook context (for reference):\n${body.context}`
    : "";

  try {
    const reply = await chat([
      { role: "system", content: NOTEBOOK_ASSISTANT_SYSTEM + contextSuffix },
      { role: "user", content: prompt },
    ]);

    const cells = parseGeneratedCells(reply, lang);
    return NextResponse.json({ cells });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Parse an LLM reply into a list of cells. Code blocks become code
 * cells; the prose between them becomes markdown cells.
 */
function parseGeneratedCells(reply: string, lang: string): GeneratedCell[] {
  const cells: GeneratedCell[] = [];
  // Match fenced code blocks, capturing the language and content.
  const codeBlockRe = new RegExp("```(" + lang + "|python|py|js|javascript)?\\n([\\s\\S]*?)```", "g");
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = codeBlockRe.exec(reply)) !== null) {
    // Prose before this block becomes a markdown cell (if non-empty).
    if (match.index > lastIndex) {
      const prose = reply.slice(lastIndex, match.index).trim();
      if (prose) cells.push({ kind: "markdown", source: prose });
    }
    cells.push({ kind: "code", source: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  // Trailing prose
  if (lastIndex < reply.length) {
    const prose = reply.slice(lastIndex).trim();
    if (prose) cells.push({ kind: "markdown", source: prose });
  }
  // If nothing was parsed, treat the whole reply as one markdown cell.
  if (cells.length === 0) {
    cells.push({ kind: "markdown", source: reply.trim() });
  }
  return cells;
}
