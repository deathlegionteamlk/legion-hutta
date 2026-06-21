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
 *  - image/png       -> <img> with data: URL (v0.5: + download link)
 *  - image/jpeg      -> <img> with data: URL (v0.5: + download link)
 *  - application/json-> pretty-printed JSON (v0.5: + copy button)
 *  - text/markdown   -> rendered markdown
 *  - text/latex      -> raw (future: KaTeX)
 *  - text/plain      -> monospace fallback (v0.5: + copy button)
 *
 * v0.5: each result chunk shows a small toolbar in the corner with
 * Copy and (where applicable) Download buttons.
 */

import { Loader2, AlertTriangle, Copy, Download, Check } from "lucide-react";
import { useState } from "react";
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

function CopyButton({ getText, label = "Copy" }: { getText: () => string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        try {
          navigator.clipboard.writeText(getText());
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard may be unavailable */
        }
      }}
      className="inline-flex items-center gap-1 rounded border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      title={label}
    >
      {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

function DownloadButton({ href, filename }: { href: string; filename: string }) {
  return (
    <a
      href={href}
      download={filename}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 rounded border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      title={`Download ${filename}`}
    >
      <Download className="h-2.5 w-2.5" />
      <span>Save</span>
    </a>
  );
}

function ResultToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover/result:opacity-100">
      {children}
    </div>
  );
}

function RichResult({ chunk }: { chunk: OutputChunk }) {
  const data = chunk.data || {};

  // Image: prefer PNG, then JPEG
  const img = data["image/png"] ?? data["image/jpeg"];
  if (typeof img === "string") {
    const mime = data["image/png"] ? "image/png" : "image/jpeg";
    const ext = mime === "image/png" ? "png" : "jpg";
    const src = img.startsWith("data:") ? img : `data:${mime};base64,${img}`;
    return (
      <div className="group/result relative my-2">
        <img
          src={src}
          alt="Cell output image"
          className="max-w-full rounded border border-border/40"
        />
        <ResultToolbar>
          <DownloadButton href={src} filename={`legion-output.${ext}`} />
        </ResultToolbar>
      </div>
    );
  }

  // HTML
  if (typeof data["text/html"] === "string") {
    return (
      <div className="group/result relative my-2 overflow-x-auto rounded border border-border/40 bg-background p-2 text-[12.5px]">
        <div dangerouslySetInnerHTML={{ __html: data["text/html"] }} />
        <ResultToolbar>
          <CopyButton getText={() => data["text/html"] as string} label="Copy HTML" />
        </ResultToolbar>
      </div>
    );
  }

  // Markdown (the %%ai magic uses this)
  if (typeof data["text/markdown"] === "string") {
    return (
      <div className="group/result relative my-2">
        <MarkdownView source={data["text/markdown"]} />
        <ResultToolbar>
          <CopyButton getText={() => data["text/markdown"] as string} label="Copy MD" />
        </ResultToolbar>
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
    const blobUrl = `data:application/json;charset=utf-8,${encodeURIComponent(jsonStr)}`;
    return (
      <div className="group/result relative my-2">
        <pre className="whitespace-pre-wrap break-words rounded border border-border/40 bg-background p-2 font-mono text-[12px] leading-relaxed">
          {jsonStr}
        </pre>
        <ResultToolbar>
          <CopyButton getText={() => jsonStr} label="Copy JSON" />
          <DownloadButton href={blobUrl} filename="legion-output.json" />
        </ResultToolbar>
      </div>
    );
  }

  // LaTeX (render as raw for now)
  if (typeof data["text/latex"] === "string") {
    return (
      <div className="group/result relative my-2">
        <pre className="whitespace-pre-wrap break-words font-mono text-[12px] italic">
          {data["text/latex"]}
        </pre>
        <ResultToolbar>
          <CopyButton getText={() => data["text/latex"] as string} label="Copy LaTeX" />
        </ResultToolbar>
      </div>
    );
  }

  // Plain text fallback
  if (chunk.text) {
    return (
      <div className="group/result relative">
        <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-foreground/90">
          {chunk.text}
        </pre>
        <ResultToolbar>
          <CopyButton getText={() => chunk.text} label="Copy text" />
        </ResultToolbar>
      </div>
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
