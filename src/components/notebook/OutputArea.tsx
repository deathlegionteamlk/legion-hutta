"use client";

/**
 * OutputArea renders the streamed outputs of a code cell.
 *
 * Output chunks come in several types:
 *  - stdout / stderr -> monospace text block (stderr is red)
 *  - error            -> styled error block with traceback
 *  - result           -> rich display: looks at the MIME bundle in
 *                        `data` and renders the richest type we support
 *
 * Supported MIME types for results:
 *  - text/html       -> sanitized inline HTML
 *  - image/png       -> <img> with data: URL
 *  - image/jpeg      -> <img> with data: URL
 *  - application/json-> pretty-printed JSON
 *  - text/markdown   -> rendered markdown
 *  - text/latex      -> raw (future: KaTeX)
 *  - text/plain      -> monospace fallback
 */

import { Loader2, AlertTriangle } from "lucide-react";
import type { CellModel, OutputChunk } from "@/types/notebook";
import { cn } from "@/lib/utils";
import { MarkdownView } from "./MarkdownView";

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
    return <RichResult chunk={chunk} />;
  }
  return null;
}

function RichResult({ chunk }: { chunk: OutputChunk }) {
  const data = chunk.data || {};

  // Image: prefer PNG, then JPEG
  const img = data["image/png"] ?? data["image/jpeg"];
  if (typeof img === "string") {
    const mime = data["image/png"] ? "image/png" : "image/jpeg";
    const src = img.startsWith("data:") ? img : `data:${mime};base64,${img}`;
    return (
      <div className="my-2">
        <img
          src={src}
          alt="Cell output image"
          className="max-w-full rounded border border-border/40"
        />
      </div>
    );
  }

  // HTML
  if (typeof data["text/html"] === "string") {
    return (
      <div
        className="my-2 overflow-x-auto rounded border border-border/40 bg-background p-2 text-[12.5px]"
        dangerouslySetInnerHTML={{ __html: data["text/html"] }}
      />
    );
  }

  // Markdown (the %%ai magic uses this)
  if (typeof data["text/markdown"] === "string") {
    return (
      <div className="my-2">
        <MarkdownView source={data["text/markdown"]} />
      </div>
    );
  }

  // JSON
  if (data["application/json"] !== undefined) {
    let jsonStr: string;
    try {
      jsonStr =
        typeof data["application/json"] === "string"
          ? JSON.stringify(JSON.parse(data["application/json"] as string), null, 2)
          : JSON.stringify(data["application/json"], null, 2);
    } catch {
      jsonStr = String(data["application/json"]);
    }
    return (
      <pre className="my-2 whitespace-pre-wrap break-words rounded border border-border/40 bg-background p-2 font-mono text-[12px] leading-relaxed">
        {jsonStr}
      </pre>
    );
  }

  // LaTeX (render as raw for now)
  if (typeof data["text/latex"] === "string") {
    return (
      <pre className="my-2 whitespace-pre-wrap break-words font-mono text-[12px] italic">
        {data["text/latex"]}
      </pre>
    );
  }

  // Plain text fallback
  if (chunk.text) {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-foreground/90">
        {chunk.text}
      </pre>
    );
  }

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
