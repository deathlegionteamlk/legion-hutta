/**
 * GET /api/sandboxes
 *
 * Proxy to the Python backend's /api/sandboxes endpoint. Returns the
 * list of sandbox backends with live availability info.
 */

import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/notebook-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await backendFetch<{ sandboxes: unknown[] }>("/api/sandboxes");
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list sandboxes";
    return NextResponse.json({ error: message, sandboxes: [] }, { status: 502 });
  }
}
