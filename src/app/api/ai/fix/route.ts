/**
 * POST /api/ai/fix
 *
 * Suggest a fix for a cell that errored.
 *
 * Request:  { source, error_name, error_value, traceback, context? }
 * Response: { fixed_source: string, explanation: string }
 *
 * The fixed source is extracted from the first fenced code block in
 * the assistant's reply.
 */

import { NextRequest, NextResponse } from "next/server";
import { chat, NOTEBOOK_ASSISTANT_SYSTEM } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FixRequest {
  source: string;
  error_name?: string;
  error_value?: string;
  traceback?: string[];
  context?: string;
}

export async function POST(req: NextRequest) {
  let body: FixRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.source) {
    return NextResponse.json({ error: "Missing 'source'" }, { status: 400 });
  }

  const tb = (body.traceback ?? []).join("").trim() || "(no traceback)";
  const prompt = `The following Python code produced an error. Propose a corrected version.

Original code:
\`\`\`python
${body.source}
\`\`\`

Error: ${body.error_name ?? "Error"}: ${body.error_value ?? ""}

Traceback:
${tb}

Respond with:
1. A fenced \`\`\`python block containing the corrected code.
2. A brief explanation (1-3 sentences) of what was wrong and how you fixed it.`;

  const contextSuffix = body.context
    ? `\n\nNotebook context (for reference):\n${body.context}`
    : "";

  try {
    const reply = await chat([
      { role: "system", content: NOTEBOOK_ASSISTANT_SYSTEM + contextSuffix },
      { role: "user", content: prompt },
    ]);

    // Extract the first fenced python code block.
    const match = reply.match(/```python\n([\s\S]*?)```/);
    const fixed_source = match ? match[1].trim() : body.source;
    const explanation = match
      ? reply.replace(/```python[\s\S]*?```/, "").trim()
      : reply.trim();

    return NextResponse.json({ fixed_source, explanation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
