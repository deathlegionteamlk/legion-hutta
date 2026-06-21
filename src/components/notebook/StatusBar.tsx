"use client";

/**
 * StatusBar — the bottom bar of the notebook (v0.4).
 *
 * Surfaces at-a-glance notebook + kernel state:
 *  - Cell count + breakdown (code vs. markdown)
 *  - Total source lines + characters
 *  - Kernel: spec, sandbox, status dot
 *  - Connection state (online / offline)
 *  - Dirty indicator + last-saved time (relative)
 *  - Auto-save state (on / off)
 *  - Clipboard state (when a cell is copied / cut)
 *  - Focus mode indicator + toggle
 *
 * Hovering the kernel pill shows a tooltip with the kernel id + spec.
 */

import { useEffect, useState } from "react";
import {
  Cpu,
  Circle,
  Save,
  Clipboard,
  Cloud,
  CloudOff,
  Loader2,
  Zap,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useNotebookStore } from "@/lib/notebook-store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { KernelStatus } from "@/types/notebook";

function statusColor(status: KernelStatus | null): string {
  switch (status) {
    case "busy":
      return "bg-amber-500 animate-pulse";
    case "idle":
      return "bg-emerald-500";
    case "starting":
      return "bg-sky-500 animate-pulse";
    case "dead":
      return "bg-red-500";
    case "interrupted":
      return "bg-orange-500";
    default:
      return "bg-gray-400";
  }
}

function relativeTime(ts: number | null): string {
  if (!ts) return "never";
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function StatusBar() {
  const cells = useNotebookStore((s) => s.cells);
  const kernelStatus = useNotebookStore((s) => s.kernelStatus);
  const kernelSpec = useNotebookStore((s) => s.kernelSpec);
  const kernelId = useNotebookStore((s) => s.kernelId);
  const selectedSandbox = useNotebookStore((s) => s.selectedSandbox);
  const isConnected = useNotebookStore((s) => s.isConnected);
  const dirty = useNotebookStore((s) => s.dirty);
  const lastSavedAt = useNotebookStore((s) => s.lastSavedAt);
  const autoSaveEnabled = useNotebookStore((s) => s.autoSaveEnabled);
  const clipboard = useNotebookStore((s) => s.clipboard);
  const focusMode = useNotebookStore((s) => s.focusMode);
  const toggleFocusMode = useNotebookStore((s) => s.toggleFocusMode);
  const isSaving = useNotebookStore((s) => s.isSaving);

  // Re-render every 15s so the relative "last saved" time stays fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const codeCount = cells.filter((c) => c.kind === "code").length;
  const mdCount = cells.filter((c) => c.kind === "markdown").length;
  const totalLines = cells.reduce((acc, c) => acc + c.source.split("\n").length, 0);
  const totalChars = cells.reduce((acc, c) => acc + c.source.length, 0);
  const totalErrors = cells.filter((c) => c.hasError).length;
  const totalRunning = cells.filter((c) => c.isRunning).length;

  return (
    <footer
      className={cn(
        "mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground",
        focusMode && "opacity-60 hover:opacity-100 transition-opacity",
      )}
    >
      {/* Connection state */}
      <span className="flex items-center gap-1.5">
        {isConnected ? (
          <Cloud className="h-3 w-3 text-emerald-500" />
        ) : (
          <CloudOff className="h-3 w-3 text-red-500" />
        )}
        <span className="font-medium">{isConnected ? "online" : "offline"}</span>
      </span>

      <Sep />

      {/* Kernel */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1.5 font-mono">
              <Cpu className="h-3 w-3" />
              <span className={cn("h-1.5 w-1.5 rounded-full", statusColor(kernelStatus))} />
              <span className="capitalize">{kernelStatus ?? "no kernel"}</span>
              {kernelSpec && (
                <span className="text-foreground/70">
                  · {kernelSpec.display_name}
                </span>
              )}
              <span className="text-muted-foreground/70">· {selectedSandbox}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-mono text-[10.5px]">
            {kernelId ? `kernel ${kernelId.slice(0, 8)}` : "no kernel attached"}
            {kernelSpec ? ` · ${kernelSpec.language}` : ""}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Sep />

      {/* Cell counts */}
      <span className="flex items-center gap-2 font-mono">
        <span>{cells.length} cells</span>
        <span className="text-muted-foreground/60">·</span>
        <span>{codeCount} code</span>
        <span className="text-muted-foreground/60">·</span>
        <span>{mdCount} md</span>
      </span>

      <Sep />

      {/* Source stats */}
      <span className="hidden items-center gap-1.5 font-mono sm:flex">
        {totalLines} lines · {totalChars} chars
      </span>

      {/* Errors / running — only show if non-zero */}
      {totalErrors > 0 && (
        <>
          <Sep />
          <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <Circle className="h-2 w-2 fill-current" />
            {totalErrors} error{totalErrors > 1 ? "s" : ""}
          </span>
        </>
      )}
      {totalRunning > 0 && (
        <>
          <Sep />
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            {totalRunning} running
          </span>
        </>
      )}

      {/* Clipboard indicator */}
      {clipboard && (
        <>
          <Sep />
          <span className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
            <Clipboard className="h-3 w-3" />
            <span className="font-mono">{clipboard.kind}</span> in clipboard
          </span>
        </>
      )}

      {/* Right side: autosave / dirty / last saved / focus mode */}
      <div className="ml-auto flex items-center gap-x-4 gap-y-1">
        {autoSaveEnabled && (
          <span className="hidden items-center gap-1.5 sm:flex">
            <Zap className="h-3 w-3 text-amber-500" />
            <span>auto-save</span>
          </span>
        )}

        <Sep />

        <span className="flex items-center gap-1.5">
          <Save className={cn("h-3 w-3", dirty ? "text-amber-500" : "text-muted-foreground/60")} />
          {isSaving ? (
            <span className="text-sky-600 dark:text-sky-400">saving…</span>
          ) : dirty ? (
            <span className="text-amber-600 dark:text-amber-400">unsaved</span>
          ) : (
            <span>saved {relativeTime(lastSavedAt)}</span>
          )}
        </span>

        <Sep />

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => toggleFocusMode()}
                className="flex items-center gap-1 hover:text-foreground"
                aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
              >
                {focusMode ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">
                  {focusMode ? "exit focus" : "focus"}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">
              {focusMode ? "Exit focus mode (F)" : "Enter focus mode (F)"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </footer>
  );
}

function Sep() {
  return <span className="hidden h-3 w-px bg-border/70 sm:inline-block" />;
}
