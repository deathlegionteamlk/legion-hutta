/**
 * POST /api/ai/explain
 *
 * Explain a cell's source code in plain language.
 *
 * Request:  { source, language?, context? }
 * Response: { explanation: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { chat, NOTEBOOK_ASSISTANT_SYSTEM } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ExplainRequest {
  source: string;
  language?: string;
  context?: string;
}

export async function POST(req: NextRequest) {
  let body: ExplainRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.source) {
    return NextResponse.json({ error: "Missing 'source'" }, { status: 400 });
  }

  const lang = body.language ?? "python";
  const prompt = `Explain what the following ${lang} code does, step by step. Be concise but complete. Use markdown for structure.

\`\`\`${lang}
${body.source}
\`\`\``;

  const contextSuffix = body.context
    ? `\n\nNotebook context (for reference):\n${body.context}`
    : "";

  try {
    const explanation = await chat([
      { role: "system", content: NOTEBOOK_ASSISTANT_SYSTEM + contextSuffix },
      { role: "user", content: prompt },
    ]);
    return NextResponse.json({ explanation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
