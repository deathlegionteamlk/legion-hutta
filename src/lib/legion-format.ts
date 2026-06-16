/**
 * Legion Hutta native notebook format (.legion)
 *
 * DESIGN GOALS
 * -------------
 * - JSON-based, easy to parse by humans and tools.
 * - Carries Legion-specific metadata (sandbox, AI history) that .ipynb
 *   doesn't have a natural place for.
 * - Lossless round-trip for the cells the UI cares about (code, markdown,
 *   outputs, execution_count).
 * - Provides .ipynb (nbformat 4) converters so users can move notebooks
 *   between Legion Hutta and Jupyter without losing data.
 *
 * FORMAT SPEC (v1)
 * ----------------
 * {
 *   "format": "legion",
 *   "format_version": 1,
 *   "metadata": {
 *     "title": "my-notebook.legion",
 *     "kernel": { "name": "python3", "display_name": "Python 3", "language": "python" },
 *     "sandbox": "local",
 *     "created_at": "2026-06-17T08:00:00.000Z",
 *     "updated_at": "2026-06-17T08:05:00.000Z",
 *     "legion_version": "0.3.0",
 *     "extensions": {}           // free-form future-proofing
 *   },
 *   "cells": [
 *     {
 *       "id": "abc123",
 *       "kind": "code" | "markdown",
 *       "source": "...",
 *       "execution_count": 3 | null,
 *       "outputs": [ { "type": "stdout", "text": "...", "data": {}, "timestamp": 0 } ]
 *     }
 *   ],
 *   "ai_history": [               // optional, omitted if empty
 *     { "id": "...", "role": "user"|"assistant", "content": "..." }
 *   ]
 * }
 *
 * VERSIONING
 * ----------
 * `format_version` is bumped on any breaking change to the schema.
 * Readers MUST check `format_version` and reject (or migrate) versions
 * they don't understand. v1 is the initial release.
 */

import type {
  CellKind,
  CellModel,
  KernelSpec,
  OutputChunk,
} from "@/types/notebook";
import type { AiMessage } from "@/lib/notebook-store";

export const LEGION_FORMAT = "legion" as const;
export const LEGION_FORMAT_VERSION = 1 as const;
export const LEGION_APP_VERSION = "0.3.0" as const;
export const LEGION_EXTENSION = ".legion" as const;

// ---- Types -------------------------------------------------------------

export interface LegionMetadata {
  title: string;
  kernel: {
    name: string;
    display_name: string;
    language: string;
  } | null;
  sandbox: string | null;
  created_at: string;
  updated_at: string;
  legion_version: string;
  extensions: Record<string, unknown>;
}

export interface LegionCell {
  id: string;
  kind: CellKind;
  source: string;
  execution_count: number | null;
  outputs: OutputChunk[];
}

export interface LegionAiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LegionDocument {
  format: typeof LEGION_FORMAT;
  format_version: typeof LEGION_FORMAT_VERSION;
  metadata: LegionMetadata;
  cells: LegionCell[];
  ai_history?: LegionAiMessage[];
}

// ---- Serializer --------------------------------------------------------

/**
 * Build a Legion document from the runtime notebook state.
 */
export function serializeLegion(opts: {
  title: string;
  cells: CellModel[];
  kernelSpec: KernelSpec | null;
  sandbox: string;
  aiMessages?: AiMessage[];
  createdAt?: string;
}): LegionDocument {
  const now = new Date().toISOString();
  return {
    format: LEGION_FORMAT,
    format_version: LEGION_FORMAT_VERSION,
    metadata: {
      title: opts.title,
      kernel: opts.kernelSpec
        ? {
            name: opts.kernelSpec.name,
            display_name: opts.kernelSpec.display_name,
            language: opts.kernelSpec.language,
          }
        : null,
      sandbox: opts.sandbox,
      created_at: opts.createdAt ?? now,
      updated_at: now,
      legion_version: LEGION_APP_VERSION,
      extensions: {},
    },
    cells: opts.cells.map((c) => ({
      id: c.id,
      kind: c.kind,
      source: c.source,
      execution_count: c.executionCount,
      outputs: c.outputs,
    })),
    ai_history:
      opts.aiMessages && opts.aiMessages.length > 0
        ? opts.aiMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        : undefined,
  };
}

/**
 * Convert a Legion document to a pretty-printed JSON string.
 */
export function legionToString(doc: LegionDocument): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * Trigger a browser download of the document as a .legion file.
 */
export function downloadLegion(doc: LegionDocument, filename?: string): void {
  const blob = new Blob([legionToString(doc)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const name = filename ?? doc.metadata.title ?? "notebook.legion";
  a.download = name.endsWith(LEGION_EXTENSION) ? name : `${name}${LEGION_EXTENSION}`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Deserializer ------------------------------------------------------

/**
 * Parse and validate a Legion document from a JSON string.
 * Throws on malformed JSON or unsupported format versions.
 */
export function parseLegion(input: string): LegionDocument {
  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch (e) {
    throw new Error(
      `Invalid .legion file: not valid JSON (${e instanceof Error ? e.message : "parse error"})`,
    );
  }
  return normalizeLegion(data);
}

/**
 * Coerce an arbitrary parsed object into a LegionDocument, applying
 * defaults for missing fields. Rejects documents whose `format` field
 * is not "legion" or whose version is unsupported.
 */
export function normalizeLegion(data: unknown): LegionDocument {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid .legion file: top-level value is not an object");
  }
  const obj = data as Record<string, unknown>;
  if (obj.format !== LEGION_FORMAT) {
    throw new Error(
      `Invalid .legion file: expected format "legion", got ${JSON.stringify(obj.format)}`,
    );
  }
  const version = obj.format_version;
  if (typeof version !== "number") {
    throw new Error("Invalid .legion file: missing format_version");
  }
  if (version > LEGION_FORMAT_VERSION) {
    throw new Error(
      `Unsupported .legion format_version ${version} (this build supports up to ${LEGION_FORMAT_VERSION}). Please upgrade Legion Hutta.`,
    );
  }

  const meta = (obj.metadata ?? {}) as Record<string, unknown>;
  const rawCells = Array.isArray(obj.cells) ? obj.cells : [];
  const rawAi = Array.isArray(obj.ai_history) ? obj.ai_history : [];

  const cells: LegionCell[] = rawCells.map((c, i) => {
    const cell = c as Record<string, unknown>;
    const kind: CellKind =
      cell.kind === "markdown" ? "markdown" : "code";
    const outputs = Array.isArray(cell.outputs) ? cell.outputs : [];
    return {
      id: typeof cell.id === "string" ? cell.id : `cell-${i}`,
      kind,
      source: typeof cell.source === "string" ? cell.source : "",
      execution_count:
        typeof cell.execution_count === "number"
          ? cell.execution_count
          : null,
      outputs: outputs.map(normalizeOutput),
    };
  });

  const ai_history: LegionAiMessage[] = rawAi.map((m, i) => {
    const msg = m as Record<string, unknown>;
    const role = msg.role === "assistant" || msg.role === "system" ? msg.role : "user";
    return {
      id: typeof msg.id === "string" ? msg.id : `ai-${i}`,
      role,
      content: typeof msg.content === "string" ? msg.content : "",
    };
  });

  const kernelMeta = meta.kernel as Record<string, unknown> | null;
  return {
    format: LEGION_FORMAT,
    format_version: LEGION_FORMAT_VERSION,
    metadata: {
      title: typeof meta.title === "string" ? meta.title : "untitled.legion",
      kernel:
        kernelMeta && typeof kernelMeta.name === "string"
          ? {
              name: kernelMeta.name,
              display_name:
                typeof kernelMeta.display_name === "string"
                  ? kernelMeta.display_name
                  : kernelMeta.name,
              language:
                typeof kernelMeta.language === "string"
                  ? kernelMeta.language
                  : "python",
            }
          : null,
      sandbox: typeof meta.sandbox === "string" ? meta.sandbox : "local",
      created_at:
        typeof meta.created_at === "string"
          ? meta.created_at
          : new Date().toISOString(),
      updated_at:
        typeof meta.updated_at === "string"
          ? meta.updated_at
          : new Date().toISOString(),
      legion_version:
        typeof meta.legion_version === "string"
          ? meta.legion_version
          : LEGION_APP_VERSION,
      extensions:
        meta.extensions && typeof meta.extensions === "object"
          ? (meta.extensions as Record<string, unknown>)
          : {},
    },
    cells,
    ai_history: ai_history.length > 0 ? ai_history : undefined,
  };
}

function normalizeOutput(o: unknown): OutputChunk {
  const obj = (o ?? {}) as Record<string, unknown>;
  const type = obj.type as OutputChunk["type"];
  return {
    type:
      type === "stdout" ||
      type === "stderr" ||
      type === "result" ||
      type === "error" ||
      type === "status"
        ? type
        : "stdout",
    text: typeof obj.text === "string" ? obj.text : "",
    data:
      obj.data && typeof obj.data === "object"
        ? (obj.data as OutputChunk["data"])
        : {},
    timestamp:
      typeof obj.timestamp === "number" ? obj.timestamp : Date.now(),
  };
}

/**
 * Load a `.legion` file from the user's machine via a file picker.
 * Returns the parsed document, or null if the user cancels.
 */
export function pickAndParseLegionFile(): Promise<LegionDocument | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".legion,application/json";
    input.style.display = "none";
    document.body.appendChild(input);
    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        resolve(parseLegion(text));
      } catch (err) {
        resolve(null);
        throw err;
      }
    };
    // If the user cancels, the file input never fires onchange; we let
    // the caller handle null. There is no clean cancel event for the
    // hidden-input trick, so this promise may stay pending. That's
    // acceptable — the user can just pick again.
    input.click();
  });
}

// ---- .ipynb interop ----------------------------------------------------

/**
 * Convert a Legion document to nbformat 4 (.ipynb) so Jupyter can open it.
 *
 * Notes:
 *  - Rich outputs (MIME bundles) are preserved in `data` for `result` outputs.
 *  - `stdout`/`stderr` become `stream` outputs.
 *  - `error` outputs become nbformat `error` outputs.
 *  - `status` outputs are dropped (they're protocol, not user-visible).
 *  - AI history is NOT carried over (no .ipynb equivalent).
 */
export function legionToIpynb(doc: LegionDocument): Record<string, unknown> {
  const kernel = doc.metadata.kernel;
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: kernel
        ? {
            name: kernel.name,
            display_name: kernel.display_name,
            language: kernel.language,
          }
        : {
            name: "python3",
            display_name: "Python 3",
            language: "python",
          },
      // Legion metadata is preserved under a custom namespace so a
      // round-trip back through .legion doesn't lose sandbox info.
      "legion-hutta": {
        format: LEGION_FORMAT,
        format_version: LEGION_FORMAT_VERSION,
        sandbox: doc.metadata.sandbox,
        legion_version: doc.metadata.legion_version,
      },
    },
    cells: doc.cells.map((c) => {
      const base = {
        id: c.id,
        cell_type: c.kind,
        source: c.source.split("\n").map((line, i, arr) =>
          i < arr.length - 1 ? line + "\n" : line,
        ),
        metadata: {},
      };
      if (c.kind === "markdown") {
        return base;
      }
      return {
        ...base,
        execution_count: c.execution_count,
        outputs: c.outputs
          .filter((o) => o.type !== "status")
          .map((o) => {
            if (o.type === "stdout" || o.type === "stderr") {
              return {
                output_type: "stream",
                name: o.type,
                text: o.text.split("\n").map((line, i, arr) =>
                  i < arr.length - 1 ? line + "\n" : line,
                ),
              };
            }
            if (o.type === "error") {
              return {
                output_type: "error",
                ename: (o.data?.name as string) ?? "Error",
                evalue: o.text,
                traceback: (o.data?.traceback as string[]) ?? [],
              };
            }
            if (o.type === "result") {
              return {
                output_type: "display_data",
                data: o.data && Object.keys(o.data).length > 0 ? o.data : { "text/plain": o.text },
                metadata: {},
              };
            }
            // Fallback: treat as stream
            return {
              output_type: "stream",
              name: "stdout",
              text: o.text.split("\n").map((line, i, arr) =>
                i < arr.length - 1 ? line + "\n" : line,
              ),
            };
          }),
      };
    }),
  };
}

/**
 * Parse an nbformat 4 (.ipynb) document into a Legion document.
 *
 * Best-effort: anything we can't map is dropped. The sandbox field is
 * pulled from the `legion-hutta` metadata namespace if present, else
 * defaults to "local".
 */
export function ipynbToLegion(input: string): LegionDocument {
  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch (e) {
    throw new Error(
      `Invalid .ipynb file: not valid JSON (${e instanceof Error ? e.message : "parse error"})`,
    );
  }
  const obj = (data ?? {}) as Record<string, unknown>;
  const meta = (obj.metadata ?? {}) as Record<string, unknown>;
  const kernelMeta = (meta.kernelspec ?? {}) as Record<string, unknown>;
  const legionMeta = (meta["legion-hutta"] ?? {}) as Record<string, unknown>;
  const rawCells = Array.isArray(obj.cells) ? obj.cells : [];

  const cells: LegionCell[] = rawCells.map((c, i) => {
    const cell = c as Record<string, unknown>;
    const kind: CellKind = cell.cell_type === "markdown" ? "markdown" : "code";
    const sourceArr = Array.isArray(cell.source) ? cell.source : [cell.source];
    const source = sourceArr.join("");
    const outputs: OutputChunk[] =
      kind === "code" && Array.isArray(cell.outputs)
        ? (cell.outputs as Array<Record<string, unknown>>).map(ipynbOutputToLegion)
        : [];
    return {
      id: typeof cell.id === "string" ? cell.id : `cell-${i}`,
      kind,
      source,
      execution_count:
        typeof cell.execution_count === "number" ? cell.execution_count : null,
      outputs,
    };
  });

  return {
    format: LEGION_FORMAT,
    format_version: LEGION_FORMAT_VERSION,
    metadata: {
      title: "imported.legion",
      kernel:
        typeof kernelMeta.name === "string"
          ? {
              name: kernelMeta.name,
              display_name:
                typeof kernelMeta.display_name === "string"
                  ? kernelMeta.display_name
                  : kernelMeta.name,
              language:
                typeof kernelMeta.language === "string"
                  ? kernelMeta.language
                  : "python",
            }
          : null,
      sandbox:
        typeof legionMeta.sandbox === "string" ? legionMeta.sandbox : "local",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      legion_version: LEGION_APP_VERSION,
      extensions: {},
    },
    cells,
  };
}

function ipynbOutputToLegion(o: Record<string, unknown>): OutputChunk {
  const t = o.output_type;
  if (t === "stream") {
    const name = o.name === "stderr" ? "stderr" : "stdout";
    const textArr = Array.isArray(o.text) ? o.text : [o.text ?? ""];
    return {
      type: name,
      text: textArr.join(""),
      data: {},
      timestamp: Date.now(),
    };
  }
  if (t === "error") {
    const traceback = Array.isArray(o.traceback) ? o.traceback : [];
    return {
      type: "error",
      text: typeof o.evalue === "string" ? o.evalue : "",
      data: {
        name: typeof o.ename === "string" ? o.ename : "Error",
        traceback: traceback.map(String),
      },
      timestamp: Date.now(),
    };
  }
  if (t === "display_data" || t === "execute_result") {
    const data = (o.data ?? {}) as Record<string, unknown>;
    const text = (data["text/plain"] ?? "") as string | string[];
    return {
      type: "result",
      text: Array.isArray(text) ? text.join("") : text,
      data: data as OutputChunk["data"],
      timestamp: Date.now(),
    };
  }
  return {
    type: "stdout",
    text: "",
    data: {},
    timestamp: Date.now(),
  };
}

/**
 * Trigger a browser download of the document as a .ipynb file.
 */
export function downloadIpynb(doc: LegionDocument, filename?: string): void {
  const ipynb = legionToIpynb(doc);
  const blob = new Blob([JSON.stringify(ipynb, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const base = filename ?? doc.metadata.title ?? "notebook";
  a.download = base.endsWith(".ipynb") ? base : `${base.replace(/\.(legion|ipynb)$/, "")}.ipynb`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Pick any file (.legion or .ipynb) and return a Legion document.
 * The format is auto-detected from the extension and the `format` field.
 */
export function pickAndLoadNotebookFile(): Promise<LegionDocument | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".legion,.ipynb,application/json";
    input.style.display = "none";
    document.body.appendChild(input);
    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        const name = file.name.toLowerCase();
        if (name.endsWith(".ipynb")) {
          resolve(ipynbToLegion(text));
          return;
        }
        // .legion or unknown — try .legion first, fall back to .ipynb
        try {
          resolve(parseLegion(text));
        } catch {
          resolve(ipynbToLegion(text));
        }
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}
