/**
 * Notebook persistence layer.
 *
 * Wraps Prisma calls for notebooks + cells. Used by:
 *  - Next.js API routes under /api/notebooks (for the frontend)
 *  - The AI routes (so agents can create / execute notebooks)
 *
 * Cells are stored as rows; outputs are JSON-encoded in a TEXT column
 * to keep the schema simple and SQLite-friendly.
 */

import { db } from "@/lib/db";
import type { CellModel, OutputChunk } from "@/types/notebook";

export interface NotebookRecord {
  id: string;
  title: string;
  kernelSpec: string | null;
  sandbox: string | null;
  createdAt: Date;
  updatedAt: Date;
  cells: CellModel[];
}

interface CellRow {
  id: string;
  kind: string;
  source: string;
  outputs: string;
  executionCount: number | null;
  position: number;
}

function rowToCellModel(row: CellRow): CellModel {
  let outputs: OutputChunk[] = [];
  try {
    outputs = JSON.parse(row.outputs || "[]");
  } catch {
    outputs = [];
  }
  return {
    id: row.id,
    kind: row.kind === "markdown" ? "markdown" : "code",
    source: row.source,
    outputs,
    executionCount: row.executionCount,
    isRunning: false,
    hasError: outputs.some((o) => o.type === "error"),
    errorSummary: null,
    executionTimeMs: null,
    collapsed: false,
  };
}

export async function listNotebooks(): Promise<
  Array<Omit<NotebookRecord, "cells">>
> {
  const rows = await db.notebook.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { cells: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    kernelSpec: r.kernelSpec,
    sandbox: r.sandbox,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function getNotebook(id: string): Promise<NotebookRecord | null> {
  const row = await db.notebook.findUnique({
    where: { id },
    include: {
      cells: { orderBy: { position: "asc" } },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    kernelSpec: row.kernelSpec,
    sandbox: row.sandbox,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    cells: row.cells.map(rowToCellModel),
  };
}

export async function createNotebook(
  title: string = "untitled.legion",
  kernelSpec: string | null = "python3",
  sandbox: string | null = "local",
  initialCells?: CellModel[],
): Promise<NotebookRecord> {
  const row = await db.notebook.create({
    data: {
      title,
      kernelSpec,
      sandbox,
      cells: {
        create: (initialCells ?? [
          {
            id: undefined,
            kind: "code",
            source: "",
            outputs: "[]",
            executionCount: null,
            position: 0,
          },
        ]).map((c, i) => ({
          // Don't persist client-generated IDs; let Prisma generate cuids
          kind: c.kind,
          source: c.source,
          outputs: JSON.stringify(c.outputs ?? []),
          executionCount: c.executionCount,
          position: i,
        })),
      },
    },
    include: { cells: { orderBy: { position: "asc" } } },
  });
  return {
    id: row.id,
    title: row.title,
    kernelSpec: row.kernelSpec,
    sandbox: row.sandbox,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    cells: row.cells.map(rowToCellModel),
  };
}

export async function renameNotebook(id: string, title: string): Promise<void> {
  await db.notebook.update({ where: { id }, data: { title } });
}

export async function deleteNotebook(id: string): Promise<void> {
  await db.notebook.delete({ where: { id } });
}

export async function saveNotebook(
  id: string,
  cells: CellModel[],
  title?: string,
): Promise<NotebookRecord> {
  // Strategy: delete all existing cells, then re-insert. Simpler than
  // diffing for our use case (notebooks are small).
  await db.$transaction([
    db.cell.deleteMany({ where: { notebookId: id } }),
    db.notebook.update({
      where: { id },
      data: {
        title: title ?? undefined,
        cells: {
          create: cells.map((c, i) => ({
            kind: c.kind,
            source: c.source,
            outputs: JSON.stringify(c.outputs ?? []),
            executionCount: c.executionCount,
            position: i,
          })),
        },
      },
    }),
  ]);
  const refreshed = await getNotebook(id);
  return refreshed!;
}

export async function updateCellOutputs(
  notebookId: string,
  cellId: string,
  outputs: OutputChunk[],
  executionCount: number | null,
): Promise<void> {
  // The cell IDs in the DB are different from the runtime IDs after a
  // save (we re-create cells). For incremental output updates we use
  // position-based lookup via the notebook's first cell with a matching
  // source. This is a known limitation — full re-saves are preferred.
  await db.cell.updateMany({
    where: { id: cellId, notebookId },
    data: {
      outputs: JSON.stringify(outputs),
      executionCount,
    },
  });
}
