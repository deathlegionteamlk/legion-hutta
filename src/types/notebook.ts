/**
 * Shared types for the Legion Hutta notebook frontend.
 *
 * These mirror the shape of the FastAPI backend responses so the API
 * client and UI components agree on a single source of truth.
 */

export type KernelStatus =
  | "starting"
  | "idle"
  | "busy"
  | "interrupted"
  | "dead";

export type OutputType =
  | "stdout"
  | "stderr"
  | "result"
  | "error"
  | "status";

/**
 * MIME-bundle data for rich output. Keys are MIME types
 * (e.g. "text/html", "image/png", "application/json", "text/markdown",
 * "text/latex"). The frontend renders the richest type it supports.
 */
export type RichData = Record<string, string | object>;

export interface KernelSpec {
  name: string;
  display_name: string;
  language: string;
  file_extension: string;
  codemirror_mode: string;
  description: string;
}

export interface KernelspecsResponse {
  default: string | null;
  kernelspecs: Record<string, KernelSpec>;
}

export interface SandboxInfo {
  sandbox_id: string;
  spec: {
    name: string;
    display_name: string;
    description: string;
    icon: string;
    requires_api_key: boolean;
    api_key_env_var: string | null;
    docs_url: string | null;
  };
  created_at: number;
}

export interface KernelInfo {
  kernel_id: string;
  status: KernelStatus;
  execution_count: number;
  created_at: number;
  last_activity: number;
  spec: KernelSpec;
  sandbox: SandboxInfo | null;
}

export interface OutputChunk {
  type: OutputType;
  text: string;
  data: RichData;
  timestamp: number;
}

export interface ExecutionResult {
  success: boolean;
  outputs: OutputChunk[];
  error_name: string | null;
  error_value: string | null;
  traceback: string[];
  execution_count: number;
}

/**
 * Frontend-only model of a notebook cell.
 * Cells live entirely in the browser; the backend only sees code
 * snippets when the user runs a cell.
 */
export type CellKind = "code" | "markdown";

export interface CellModel {
  id: string;
  kind: CellKind;
  /** Source text of the cell. */
  source: string;
  /** Outputs from the most recent execution (code cells only). */
  outputs: OutputChunk[];
  /** Execution count assigned by the kernel, or null if never run. */
  executionCount: number | null;
  /** True while the cell is awaiting execution results. */
  isRunning: boolean;
  /** True if the last execution produced an error. */
  hasError: boolean;
  /** Cached error summary for display. */
  errorSummary: { name: string; value: string; traceback: string[] } | null;
  /** Wall-clock time of the last execution in milliseconds, or null. */
  executionTimeMs: number | null;
  /** True if the code editor is collapsed (output only). */
  collapsed: boolean;
}

export interface NotebookState {
  id: string;
  title: string;
  cells: CellModel[];
  /** The kernel attached to this notebook. A notebook has exactly one. */
  kernelId: string | null;
  kernelStatus: KernelStatus | null;
  kernelSpec: KernelSpec | null;
  /** Active cell, used for keyboard shortcuts. */
  activeCellId: string | null;
}
