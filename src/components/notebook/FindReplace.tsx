"use client";

/**
 * FindReplace — modal dialog for finding and replacing text across
 * all notebook cells.
 *
 * Triggered via Ctrl+H (or the command palette). Reports per-cell
 * match counts in real time and supports regex + case-sensitive
 * toggles. Replacing marks the notebook dirty.
 */

import { useMemo, useState } from "react";
import { Search, Replace, X, Regex, CaseSensitive } from "lucide-react";
import { useNotebookStore } from "@/lib/notebook-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function FindReplace() {
  const open = useNotebookStore((s) => s.findReplaceOpen);
  const toggle = useNotebookStore((s) => s.toggleFindReplace);
  const findInCells = useNotebookStore((s) => s.findInCells);
  const replaceInCells = useNotebookStore((s) => s.replaceInCells);
  const jumpToCell = useNotebookStore((s) => s.jumpToCell);
  const cells = useNotebookStore((s) => s.cells);

  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);
  const [lastReplacementCount, setLastReplacementCount] = useState<number | null>(null);

  const results = useMemo(() => {
    if (!query) return [];
    return findInCells(query, { caseSensitive, regex });
  }, [query, caseSensitive, regex, findInCells]);

  const totalMatches = results.reduce((sum, r) => sum + r.matches, 0);

  if (!open) return null;

  const handleReplaceAll = () => {
    if (!query) return;
    const count = replaceInCells(query, replacement, { caseSensitive, regex, all: true });
    setLastReplacementCount(count);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24 backdrop-blur-sm"
      onClick={() => toggle(false)}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border/80 bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            Find &amp; Replace
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => toggle(false)}
            aria-label="Close find & replace"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-3 px-4 py-3">
          {/* Find row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLastReplacementCount(null);
                }}
                placeholder="Find in all cells…"
                className="h-9 pl-8 pr-2 text-[13px]"
                autoFocus
              />
            </div>
            <Button
              size="icon"
              variant={caseSensitive ? "default" : "outline"}
              className="h-9 w-9"
              onClick={() => setCaseSensitive((v) => !v)}
              title="Match case"
              aria-label="Match case"
              aria-pressed={caseSensitive}
            >
              <CaseSensitive className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant={regex ? "default" : "outline"}
              className="h-9 w-9 font-mono"
              onClick={() => setRegex((v) => !v)}
              title="Regular expression"
              aria-label="Regular expression"
              aria-pressed={regex}
            >
              <Regex className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Replace row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Replace className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="Replace with…"
                className="h-9 pl-8 pr-2 text-[13px]"
              />
            </div>
            <Button
              variant="default"
              size="sm"
              className="h-9 px-3"
              onClick={handleReplaceAll}
              disabled={!query || totalMatches === 0}
            >
              Replace All
            </Button>
          </div>

          {/* Results */}
          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
            {query === "" ? (
              <div className="text-[11.5px] text-muted-foreground">
                Type a query to search across all {cells.length} cells.
              </div>
            ) : totalMatches === 0 ? (
              <div className="text-[11.5px] text-muted-foreground">
                No matches found.
              </div>
            ) : (
              <>
                <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                  <span className="font-medium">
                    {totalMatches} match{totalMatches === 1 ? "" : "es"} in{" "}
                    {results.length} cell{results.length === 1 ? "" : "s"}
                  </span>
                  {lastReplacementCount !== null && (
                    <Badge variant="secondary" className="text-[10px]">
                      {lastReplacementCount} replaced
                    </Badge>
                  )}
                </div>
                <ul className="space-y-0.5">
                  {results.slice(0, 8).map((r) => {
                    const cell = cells.find((c) => c.id === r.cellId);
                    const idx = cell ? cells.indexOf(cell) : -1;
                    return (
                      <li key={r.cellId}>
                        <button
                          type="button"
                          onClick={() => {
                            jumpToCell(r.cellId);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded px-1.5 py-1 text-[11.5px] transition-colors",
                            "hover:bg-background",
                          )}
                        >
                          <span className="truncate text-left text-muted-foreground">
                            <span className="font-mono text-[10px] text-violet-500/80">
                              {cell?.kind === "markdown" ? "md" : "code"}
                            </span>{" "}
                            <span className="text-foreground/70">#{idx + 1}</span>
                            <span className="ml-2 font-mono">
                              {cell?.source.slice(0, 60).replace(/\n/g, " ") || "(empty)"}
                              {(cell?.source.length ?? 0) > 60 ? "…" : ""}
                            </span>
                          </span>
                          <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                            {r.matches}
                          </Badge>
                        </button>
                      </li>
                    );
                  })}
                  {results.length > 8 && (
                    <li className="px-1.5 py-1 text-[10.5px] italic text-muted-foreground/70">
                      + {results.length - 8} more cells with matches
                    </li>
                  )}
                </ul>
              </>
            )}
          </div>

          <div className="text-[10.5px] text-muted-foreground/70">
            Tip: press <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">Esc</kbd>{" "}
            to close, or click outside the dialog.
          </div>
        </div>
      </div>
    </div>
  );
}
