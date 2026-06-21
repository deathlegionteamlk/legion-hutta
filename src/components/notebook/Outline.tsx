"use client";

/**
 * Outline — left-side table of contents panel.
 *
 * Scans the notebook's markdown cells for ATX headings (# .. ######)
 * and renders a clickable outline. Clicking a heading jumps to its
 * cell and scrolls it into view.
 *
 * Also lists code cells (collapsed, no source preview) as small
 * "code [N]" entries so users can jump to a specific cell by index.
 *
 * v0.5: also shows a "Bookmarks" section listing every cell with
 * `bookmarked: true`.
 */

import { useMemo } from "react";
import { List, X, Star } from "lucide-react";
import { useNotebookStore } from "@/lib/notebook-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CellModel } from "@/types/notebook";

interface OutlineEntry {
  cellId: string;
  cellIndex: number;
  level: number; // 1..6 for headings; 0 for code cells
  text: string;
}

function extractHeadings(cell: CellModel, cellIndex: number): OutlineEntry[] {
  if (cell.kind !== "markdown") {
    return [
      {
        cellId: cell.id,
        cellIndex,
        level: 0,
        text: cell.source.trim().split("\n", 1)[0].slice(0, 40) || `Code ${cellIndex + 1}`,
      },
    ];
  }
  const entries: OutlineEntry[] = [];
  const lines = cell.source.split("\n");
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (m) {
      entries.push({
        cellId: cell.id,
        cellIndex,
        level: m[1].length,
        text: m[2].replace(/[*_`]/g, ""),
      });
    }
  }
  return entries;
}

export function Outline() {
  const open = useNotebookStore((s) => s.outlineOpen);
  const toggle = useNotebookStore((s) => s.toggleOutlinePanel);
  const cells = useNotebookStore((s) => s.cells);
  const activeCellId = useNotebookStore((s) => s.activeCellId);
  const jumpToCell = useNotebookStore((s) => s.jumpToCell);

  const entries = useMemo(() => {
    const out: OutlineEntry[] = [];
    cells.forEach((c, i) => {
      out.push(...extractHeadings(c, i));
    });
    return out;
  }, [cells]);

  const bookmarks = useMemo(
    () => cells.map((c, i) => ({ cell: c, index: i })).filter((x) => x.cell.bookmarked),
    [cells],
  );

  if (!open) return null;

  return (
    <aside className="fixed left-0 top-14 z-20 h-[calc(100vh-3.5rem)] w-72 border-r border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <List className="h-3 w-3" />
            Outline
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => toggle(false)}
            aria-label="Close outline"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {bookmarks.length > 0 && (
            <div className="mb-3">
              <div className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Star className="mr-1 inline h-3 w-3 fill-amber-500 text-amber-500" />
                Bookmarks
              </div>
              <ul className="space-y-0.5">
                {bookmarks.map(({ cell, index }) => (
                  <li key={cell.id}>
                    <button
                      type="button"
                      onClick={() => jumpToCell(cell.id)}
                      className={cn(
                        "flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left text-[12px] transition-colors",
                        cell.id === activeCellId
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                      style={{ paddingLeft: `14px` }}
                      title={`Jump to cell ${index + 1}`}
                    >
                      <span className="font-mono text-[10px] text-amber-500/80">
                        ★
                      </span>
                      <span className="font-mono italic">
                        {cell.source.trim().split("\n", 1)[0].slice(0, 40) || `Cell ${index + 1}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {entries.length === 0 && bookmarks.length === 0 ? (
            <div className="px-2 py-4 text-[11.5px] italic text-muted-foreground/70">
              No headings yet. Add markdown cells starting with{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10.5px]">#</code>{" "}
              to populate the outline.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {entries.map((e, i) => {
                const isActive = e.cellId === activeCellId;
                const indent = e.level > 0 ? (e.level - 1) * 12 : 8;
                return (
                  <li key={`${e.cellId}-${i}`}>
                    <button
                      type="button"
                      onClick={() => jumpToCell(e.cellId)}
                      className={cn(
                        "flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left text-[12px] transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                      style={{ paddingLeft: `${indent + 6}px` }}
                      title={`Jump to cell ${e.cellIndex + 1}`}
                    >
                      {e.level > 0 ? (
                        <span className="font-mono text-[10px] text-muted-foreground/70">
                          {"#".repeat(e.level)}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-violet-500/80">code</span>
                      )}
                      <span className={cn(e.level === 1 && "font-semibold", e.level === 0 && "font-mono italic")}>
                        {e.text}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
