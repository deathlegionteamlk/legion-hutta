/**
 * Single-notebook routes.
 *   GET    /api/notebooks/[id]
 *   PUT    /api/notebooks/[id]    { title?, cells: CellModel[] }
 *   DELETE /api/notebooks/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getNotebook,
  renameNotebook,
  deleteNotebook,
  saveNotebook,
} from "@/lib/notebook-persistence";
import type { CellModel } from "@/types/notebook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ notebook });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get notebook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  let body: { title?: string; cells?: CellModel[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    if (body.cells) {
      const notebook = await saveNotebook(id, body.cells, body.title);
      return NextResponse.json({ notebook });
    }
    if (body.title) {
      await renameNotebook(id, body.title);
      const notebook = await getNotebook(id);
      return NextResponse.json({ notebook });
    }
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update notebook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await deleteNotebook(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete notebook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
