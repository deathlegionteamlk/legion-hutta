"use client";

/**
 * Notebook — the top-level notebook shell.
 *
 * Wires up:
 *  - Backend init on mount (health check + auto-start kernel)
 *  - Keyboard shortcuts (Shift+Enter / Ctrl+Enter / Alt+Enter, B/A
 *    above/below, D D delete, etc.)
 *  - Renders the toolbar + scrollable list of cells + footer status
 */

import { useEffect } from "react";
import { useNotebookStore } from "@/lib/notebook-store";
import { Toolbar } from "./Toolbar";
import { Cell } from "./Cell";
import { Button } from "@/components/ui/button";
import { Plus, Keyboard } from "lucide-react";

export function Notebook() {
  const cells = useNotebookStore((s) => s.cells);
  const init = useNotebookStore((s) => s.init);
  const addCell = useNotebookStore((s) => s.addCell);
  const activeCellId = useNotebookStore((s) => s.activeCellId);
  const setActiveCell = useNotebookStore((s) => s.setActiveCell);
  const runCell = useNotebookStore((s) => s.runCell);
  const removeCell = useNotebookStore((s) => s.removeCell);

  // Boot the backend connection + kernel on first mount.
  useEffect(() => {
    init();
  }, [init]);

  // Global keyboard shortcuts. We attach to window because CodeMirror
  // stops propagation on some keys but not others; this catches the
  // notebook-level commands reliably.
  useEffect(() => {
    let lastDPress = 0;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest(".cm-editor"));

      // Escape blurs the editor so notebook shortcuts work.
      if (e.key === "Escape" && isTyping) {
        (target as HTMLElement).blur();
        return;
      }
      if (isTyping) return;

      if (!activeCellId) return;
      const idx = cells.findIndex((c) => c.id === activeCellId);
      if (idx < 0) return;

      // B / A — insert cell below / above
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        addCell(activeCellId, "code");
        return;
      }
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        const prevId = idx > 0 ? cells[idx - 1].id : null;
        addCell(prevId, "code");
        return;
      }
      // Double-tap D to delete (mirrors Jupyter)
      if (e.key === "d" || e.key === "D") {
        const now = Date.now();
        if (now - lastDPress < 400) {
          e.preventDefault();
          removeCell(activeCellId);
        }
        lastDPress = now;
        return;
      }
      // Arrow up/down to navigate cells
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (idx > 0) setActiveCell(cells[idx - 1].id);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (idx < cells.length - 1) setActiveCell(cells[idx + 1].id);
        return;
      }
      // Enter to start editing
      if (e.key === "Enter") {
        e.preventDefault();
        const cell = cells[idx];
        const editor = document.querySelector(
          `[data-cell-id="${cell.id}"] .cm-editor`,
        ) as HTMLElement | null;
        editor?.focus();
        return;
      }
      // Ctrl/Cmd+Enter runs the active cell
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        runCell(activeCellId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeCellId, cells, addCell, removeCell, setActiveCell, runCell]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Toolbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="flex flex-col gap-3">
          {cells.map((cell, idx) => (
            <div key={cell.id} data-cell-id={cell.id}>
              <Cell cell={cell} index={idx} />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[12px]"
            onClick={() => addCell(cells[cells.length - 1]?.id ?? null, "code")}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Cell
          </Button>
        </div>

        <KeyboardHints />
      </main>

      <footer className="mt-auto border-t border-border/60 bg-muted/30 px-4 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            Legion Hutta v0.1.0 · by{" "}
            <span className="font-medium text-foreground/80">Death Legion Team</span>
          </span>
          <span className="font-mono">better than all notebooks</span>
        </div>
      </footer>
    </div>
  );
}

function KeyboardHints() {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Keyboard className="h-3 w-3" />
        Keyboard shortcuts
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-[11.5px] text-muted-foreground sm:grid-cols-2 md:grid-cols-3">
        <Hint k="Shift+Enter" desc="Run cell, select below" />
        <Hint k="Ctrl+Enter" desc="Run cell" />
        <Hint k="Alt+Enter" desc="Run cell, insert below" />
        <Hint k="B" desc="Insert cell below" />
        <Hint k="A" desc="Insert cell above" />
        <Hint k="D D" desc="Delete cell" />
        <Hint k="↑ / ↓" desc="Navigate cells" />
        <Hint k="Enter" desc="Edit cell" />
        <Hint k="Esc" desc="Exit edit mode" />
      </div>
    </div>
  );
}

function Hint({ k, desc }: { k: string; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10.5px] text-foreground/80 shadow-sm">
        {k}
      </kbd>
      <span>{desc}</span>
    </div>
  );
}
