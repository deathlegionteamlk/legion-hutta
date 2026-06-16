"use client";

/**
 * OutputArea renders the streamed outputs of a code cell.
 *
 * Outputs come in three flavors:
 *  - stdout / stderr  -> monospace text block (stderr is red)
 *  - error            -> styled error block with traceback
 *  - result           -> rich display (future: plots, HTML, etc.)
 *
 * If the cell is currently running with no output yet, a subtle
 * pulsing dot is shown so the user knows something is happening.
 */

import { Loader2, Terminal, AlertTriangle } from "lucide-react";
import type { CellModel, OutputChunk } from "@/types/notebook";
import { cn } from "@/lib/utils";

interface OutputAreaProps {
  cell: CellModel;
}

export function OutputArea({ cell }: OutputAreaProps) {
  const hasOutput = cell.outputs.length > 0 || cell.hasError;
  const showRunning = cell.isRunning && !hasOutput;

  if (!hasOutput && !cell.isRunning) return null;

  return (
    <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
      {showRunning && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Executing…</span>
        </div>
      )}

      {cell.outputs.map((chunk, i) => (
        <OutputChunkView key={i} chunk={chunk} />
      ))}

      {cell.hasError && cell.errorSummary && (
        <ErrorView error={cell.errorSummary} />
      )}
    </div>
  );
}

function OutputChunkView({ chunk }: { chunk: OutputChunk }) {
  if (chunk.type === "stdout") {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-foreground/90">
        {chunk.text}
      </pre>
    );
  }
  if (chunk.type === "stderr") {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-red-600 dark:text-red-400">
        {chunk.text}
      </pre>
    );
  }
  if (chunk.type === "result") {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-foreground/90">
        {chunk.text}
      </pre>
    );
  }
  // status / unknown chunks are not rendered in the output area
  return null;
}

function ErrorView({
  error,
}: {
  error: NonNullable<CellModel["errorSummary"]>;
}) {
  return (
    <div
      className={cn(
        "mt-2 rounded-md border border-red-300/60 bg-red-50/80 px-3 py-2",
        "dark:border-red-900/60 dark:bg-red-950/40",
      )}
    >
      <div className="flex items-center gap-2 text-[12px] font-medium text-red-700 dark:text-red-300">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="font-mono">{error.name}</span>
        {error.value && <span className="opacity-80">: {error.value}</span>}
      </div>
      {error.traceback.length > 0 && (
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-red-800/90 dark:text-red-200/80">
          {error.traceback.join("")}
        </pre>
      )}
    </div>
  );
}

export function OutputEmptyState() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-muted-foreground/70">
      <Terminal className="h-3 w-3" />
      <span>No output yet — press Shift+Enter to run this cell.</span>
    </div>
  );
}
