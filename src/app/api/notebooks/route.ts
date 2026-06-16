/**
 * Notebook persistence API.
 *
 *   GET    /api/notebooks           list all notebooks
 *   POST   /api/notebooks           create a new notebook
 *
 *   GET    /api/notebooks/:id       get a notebook (with cells)
 *   PUT    /api/notebooks/:id       update notebook (title + cells)
 *   DELETE /api/notebooks/:id       delete a notebook
 *
 * All routes are server-side and operate on the local SQLite DB
 * via Prisma.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listNotebooks,
  createNotebook,
} from "@/lib/notebook-persistence";
import type { CellModel } from "@/types/notebook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notebooks = await listNotebooks();
    return NextResponse.json({ notebooks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list notebooks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: {
    title?: string;
    kernelSpec?: string | null;
    sandbox?: string | null;
    cells?: CellModel[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const notebook = await createNotebook(
      body.title,
      body.kernelSpec ?? "python3",
      body.sandbox ?? "local",
      body.cells,
    );
    return NextResponse.json({ notebook });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create notebook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
