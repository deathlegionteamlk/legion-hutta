"use client";

/**
 * Cell — the fundamental unit of a notebook.
 *
 * Each cell has:
 *  - a left gutter with execution count / type indicator
 *  - an editor area (code or markdown)
 *  - an output area (code cells only)
 *  - a hover toolbar with cell actions (run, move up/down, delete, etc.)
 *  - a collapse toggle (code cells only — hides the editor, shows output)
 *  - an execution-time badge (code cells only — shown after a run)
 *
 * Cells are clickable to set active; the active cell is highlighted
 * with a border accent.
 */

import { useEffect, useRef } from "react";
import {
  Play,
  Square,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  Code2,
  FileText,
  CircleDot,
  Bot,
  Bug,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotebookStore } from "@/lib/notebook-store";
import type { CellModel } from "@/types/notebook";
import { CodeEditor } from "./CodeEditor";
import { OutputArea } from "./OutputArea";
import { MarkdownView } from "./MarkdownView";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CellProps {
  cell: CellModel;
  index: number;
}

function formatDuration(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 2 : 1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);
  return `${m}m${rem}s`;
}

export function Cell({ cell, index }: CellProps) {
  const activeCellId = useNotebookStore((s) => s.activeCellId);
  const setCellSource = useNotebookStore((s) => s.setCellSource);
  const setActiveCell = useNotebookStore((s) => s.setActiveCell);
  const runCell = useNotebookStore((s) => s.runCell);
  const addCell = useNotebookStore((s) => s.addCell);
  const removeCell = useNotebookStore((s) => s.removeCell);
  const moveCell = useNotebookStore((s) => s.moveCell);
  const setCellKind = useNotebookStore((s) => s.setCellKind);
  const clearCellOutput = useNotebookStore((s) => s.clearCellOutput);
  const explainCell = useNotebookStore((s) => s.explainCell);
  const fixCell = useNotebookStore((s) => s.fixCell);
  const toggleCellCollapsed = useNotebookStore((s) => s.toggleCellCollapsed);
  const wordWrap = useNotebookStore((s) => s.wordWrap);
  const lineNumbers = useNotebookStore((s) => s.lineNumbers);
  void useNotebookStore((s) => s.runAll); // referenced in keyboard hints only

  const isActive = activeCellId === cell.id;
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll the cell into view when it becomes active via keyboard nav.
  useEffect(() => {
    if (isActive && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.top < 80 || rect.bottom > window.innerHeight - 40) {
        containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [isActive]);

  const onRun = () => {
    if (cell.kind === "code") runCell(cell.id);
  };
  const onRunAndInsert = () => {
    if (cell.kind === "code") {
      runCell(cell.id);
    }
    addCell(cell.id, "code");
  };

  const isCollapsedCode = cell.kind === "code" && cell.collapsed;

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative rounded-lg border bg-card transition-all",
        isActive
          ? "border-primary/40 ring-1 ring-primary/20 shadow-sm"
          : "border-border/60 hover:border-border",
        cell.hasError && "border-red-400/50",
      )}
      onClick={() => setActiveCell(cell.id)}
    >
      {/* Left gutter: execution count or markdown icon, with collapse chevron for code */}
      <div className="absolute left-0 top-0 flex h-full w-10 flex-col items-center justify-start gap-1 pt-2.5 text-[10px] text-muted-foreground">
        {cell.kind === "code" ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCellCollapsed(cell.id);
              }}
              className="flex h-4 w-4 items-center justify-center text-muted-foreground/70 hover:text-foreground"
              title={cell.collapsed ? "Expand code" : "Collapse code (output only)"}
              aria-label={cell.collapsed ? "Expand code" : "Collapse code"}
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform",
                  !cell.collapsed && "rotate-90",
                )}
              />
            </button>
            <span
              className={cn(
                "font-mono",
                cell.isRunning ? "text-amber-500" : cell.executionCount !== null ? "text-foreground/70" : "text-muted-foreground/40",
              )}
              title={`Execution #${cell.executionCount ?? "—"}`}
            >
              [{cell.isRunning ? "*" : cell.executionCount ?? " "}]
            </span>
            {cell.executionTimeMs !== null && !cell.isRunning && (
              <span
                className="mt-0.5 hidden font-mono text-[9px] text-muted-foreground/60 sm:block"
                title={`Last run: ${formatDuration(cell.executionTimeMs)}`}
              >
                {formatDuration(cell.executionTimeMs)}
              </span>
            )}
          </>
        ) : (
          <FileText className="mt-1 h-3 w-3 text-muted-foreground/60" />
        )}
      </div>

      {/* Hover toolbar */}
      <div
        className={cn(
          "absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-md border border-border/60 bg-background/95 px-1 py-1 opacity-0 shadow-sm backdrop-blur transition-opacity",
          "group-hover:opacity-100",
          isActive && "opacity-100",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <TooltipProvider delayDuration={300}>
          <CellTooltip label={cell.kind === "code" ? "Run cell (Shift+Enter)" : "Render"}>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onRun}
              disabled={cell.kind !== "code" || cell.isRunning}
            >
              {cell.isRunning ? (
                <Square className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>
          </CellTooltip>

          <CellTooltip label="Move up">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => moveCell(cell.id, -1)}
              disabled={index === 0}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          </CellTooltip>

          <CellTooltip label="Move down">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => moveCell(cell.id, 1)}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </CellTooltip>

          <CellTooltip label={cell.kind === "code" ? "Switch to Markdown" : "Switch to Code"}>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setCellKind(cell.id, cell.kind === "code" ? "markdown" : "code")}
            >
              {cell.kind === "code" ? (
                <FileText className="h-3 w-3" />
              ) : (
                <Code2 className="h-3 w-3" />
              )}
            </Button>
          </CellTooltip>

          {cell.kind === "code" && cell.outputs.length > 0 && (
            <CellTooltip label="Clear output">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => clearCellOutput(cell.id)}
              >
                <CircleDot className="h-3 w-3" />
              </Button>
            </CellTooltip>
          )}

          <CellTooltip label="Insert cell below">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => addCell(cell.id, "code")}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </CellTooltip>

          <div className="mx-0.5 h-4 w-px bg-border/60" />

          {cell.kind === "code" && (
            <CellTooltip label="Explain with AI">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-violet-600 hover:text-violet-700 dark:text-violet-400"
                onClick={() => explainCell(cell.id)}
              >
                <Bot className="h-3 w-3" />
              </Button>
            </CellTooltip>
          )}
          {cell.kind === "code" && cell.hasError && (
            <CellTooltip label="Fix error with AI">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-amber-600 hover:text-amber-700 dark:text-amber-400"
                onClick={() => fixCell(cell.id)}
              >
                <Bug className="h-3 w-3" />
              </Button>
            </CellTooltip>
          )}

          <CellTooltip label="Delete cell">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => removeCell(cell.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </CellTooltip>
        </TooltipProvider>
      </div>

      {/* Cell content */}
      <div className="ml-10 pl-2 pr-2">
        {cell.kind === "code" ? (
          <>
            {!isCollapsedCode && (
              <CodeEditor
                value={cell.source}
                onChange={(v) => setCellSource(cell.id, v)}
                onRun={onRun}
                onRunAndInsert={onRunAndInsert}
                autoFocus={isActive}
                placeholder="# Type Python code here…"
                wordWrap={wordWrap}
                lineNumbers={lineNumbers}
              />
            )}
            {isCollapsedCode && cell.outputs.length === 0 && !cell.isRunning && (
              <div className="flex items-center gap-2 py-3 text-[11.5px] italic text-muted-foreground/70">
                <ChevronRight className="h-3 w-3" />
                Code hidden — click the chevron to expand
              </div>
            )}
            <OutputArea cell={cell} />
            {/* Subtle execution-time footer for collapsed cells (where gutter is hidden) */}
            {isCollapsedCode && cell.executionTimeMs !== null && !cell.isRunning && (
              <div className="flex items-center gap-1 pb-1.5 pt-0.5 text-[10px] text-muted-foreground/60">
                <Clock className="h-2.5 w-2.5" />
                <span className="font-mono">{formatDuration(cell.executionTimeMs)}</span>
              </div>
            )}
          </>
        ) : (
          <div className="py-3">
            <MarkdownView source={cell.source} />
          </div>
        )}
      </div>
    </div>
  );
}

function CellTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px]">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
