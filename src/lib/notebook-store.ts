/**
 * Notebook store.
 *
 * Holds all frontend notebook state: the cells, the attached kernel,
 * kernel status, and the operations the UI can perform (add/remove
 * cells, run cells, interrupt, restart, etc.).
 *
 * The store is intentionally framework-agnostic — components subscribe
 * via the standard zustand hooks. All backend interaction goes through
 * the `api` client.
 */

import { create } from "zustand";
import { api } from "@/lib/notebook-api";
import type {
  CellKind,
  CellModel,
  KernelSpec,
  KernelStatus,
  NotebookState,
  OutputChunk,
} from "@/types/notebook";

function newId(): string {
  // Avoid pulling in `uuid` for a single call site.
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

function makeCell(kind: CellKind = "code", source: string = ""): CellModel {
  return {
    id: newId(),
    kind,
    source,
    outputs: [],
    executionCount: null,
    isRunning: false,
    hasError: false,
    errorSummary: null,
  };
}

const WELCOME_CELLS: CellModel[] = [
  makeCell(
    "markdown",
    "# Welcome to **Legion Hutta**\n\nA modern, language-agnostic notebook by *Death Legion Team* — better than all notebooks.\n\nRun the cell below to verify your Python kernel is alive.",
  ),
  makeCell(
    "code",
    'import sys\nprint("Legion Hutta v0.1.0")\nprint(f"Python {sys.version.split()[0]} on {sys.platform}")\nprint("Death Legion Team \u2014 better than all notebooks")\n\n# State persists across cells:\nx = 6\ny = 7\n',
  ),
  makeCell(
    "code",
    '# This cell reuses `x` and `y` from the previous cell.\nprint(f"x * y = {x * y}")\n\n# Try editing me and pressing Shift+Enter!\n',
  ),
];

interface NotebookStore extends NotebookState {
  specs: KernelSpec[];
  defaultSpecName: string | null;
  isConnected: boolean;
  isStartingKernel: boolean;
  error: string | null;

  // lifecycle
  init: () => Promise<void>;
  startKernel: (specName?: string) => Promise<void>;
  interruptKernel: () => Promise<void>;
  restartKernel: () => Promise<void>;

  // cell ops
  addCell: (afterCellId?: string | null, kind?: CellKind) => string;
  removeCell: (cellId: string) => void;
  moveCell: (cellId: string, direction: -1 | 1) => void;
  setCellSource: (cellId: string, source: string) => void;
  setActiveCell: (cellId: string | null) => void;
  setCellKind: (cellId: string, kind: CellKind) => void;
  clearCellOutput: (cellId: string) => void;

  // execution
  runCell: (cellId: string) => Promise<void>;
  runAll: () => Promise<void>;

  // utility
  setTitle: (title: string) => void;
}

export const useNotebookStore = create<NotebookStore>((set, get) => ({
  id: newId(),
  title: "legion-hutta.ipynb",
  cells: WELCOME_CELLS,
  kernelId: null,
  kernelStatus: null,
  kernelSpec: null,
  activeCellId: WELCOME_CELLS[1].id,
  specs: [],
  defaultSpecName: null,
  isConnected: false,
  isStartingKernel: false,
  error: null,

  init: async () => {
    try {
      const [health, specs, existingKernels] = await Promise.all([
        api.health(),
        api.listKernelspecs(),
        api.listKernels(),
      ]);
      set({
        isConnected: health.status === "ok",
        specs: Object.values(specs.kernelspecs),
        defaultSpecName: specs.default,
        error: null,
      });
      // Reuse an existing idle kernel if the backend already has one
      // (e.g. after a page reload). This avoids orphan kernels piling
      // up in the backend's kernel manager during development.
      const reusable = existingKernels.kernels.find(
        (k) => k.status !== "dead" && k.spec?.name === (specs.default ?? "python3"),
      );
      if (reusable) {
        set({
          kernelId: reusable.kernel_id,
          kernelStatus: reusable.status,
          kernelSpec: reusable.spec,
        });
      } else if (!get().kernelId) {
        await get().startKernel(specs.default ?? undefined);
      }
    } catch (err) {
      set({
        isConnected: false,
        error: err instanceof Error ? err.message : "Failed to connect to backend",
      });
    }
  },

  startKernel: async (specName?: string) => {
    set({ isStartingKernel: true, error: null });
    try {
      const name = specName ?? get().defaultSpecName ?? "python3";
      const kernel = await api.createKernel(name);
      set({
        kernelId: kernel.kernel_id,
        kernelStatus: kernel.status,
        kernelSpec: kernel.spec,
        isStartingKernel: false,
      });
    } catch (err) {
      set({
        isStartingKernel: false,
        error: err instanceof Error ? err.message : "Failed to start kernel",
      });
    }
  },

  interruptKernel: async () => {
    const { kernelId } = get();
    if (!kernelId) return;
    try {
      const k = await api.interruptKernel(kernelId);
      set({ kernelStatus: k.status });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Interrupt failed" });
    }
  },

  restartKernel: async () => {
    const { kernelId } = get();
    if (!kernelId) return;
    try {
      set({ kernelStatus: "starting" });
      const k = await api.restartKernel(kernelId);
      // Reset execution counts on all cells since the kernel state was cleared.
      set((s) => ({
        kernelStatus: k.status,
        cells: s.cells.map((c) => ({
          ...c,
          outputs: [],
          executionCount: null,
          hasError: false,
          errorSummary: null,
          isRunning: false,
        })),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Restart failed" });
    }
  },

  addCell: (afterCellId, kind = "code") => {
    const cell = makeCell(kind);
    set((s) => {
      const idx = afterCellId ? s.cells.findIndex((c) => c.id === afterCellId) : s.cells.length - 1;
      const cells = [...s.cells];
      cells.splice(idx + 1, 0, cell);
      return { cells, activeCellId: cell.id };
    });
    return cell.id;
  },

  removeCell: (cellId) => {
    set((s) => {
      if (s.cells.length <= 1) return s;
      const idx = s.cells.findIndex((c) => c.id === cellId);
      const cells = s.cells.filter((c) => c.id !== cellId);
      const nextActive =
        s.activeCellId === cellId
          ? cells[Math.min(idx, cells.length - 1)]?.id ?? null
          : s.activeCellId;
      return { cells, activeCellId: nextActive };
    });
  },

  moveCell: (cellId, direction) => {
    set((s) => {
      const idx = s.cells.findIndex((c) => c.id === cellId);
      if (idx < 0) return s;
      const target = idx + direction;
      if (target < 0 || target >= s.cells.length) return s;
      const cells = [...s.cells];
      [cells[idx], cells[target]] = [cells[target], cells[idx]];
      return { cells };
    });
  },

  setCellSource: (cellId, source) => {
    set((s) => ({
      cells: s.cells.map((c) => (c.id === cellId ? { ...c, source } : c)),
    }));
  },

  setActiveCell: (cellId) => set({ activeCellId: cellId }),

  setCellKind: (cellId, kind) => {
    set((s) => ({
      cells: s.cells.map((c) =>
        c.id === cellId
          ? { ...c, kind, outputs: kind === "markdown" ? [] : c.outputs }
          : c,
      ),
    }));
  },

  clearCellOutput: (cellId) => {
    set((s) => ({
      cells: s.cells.map((c) =>
        c.id === cellId
          ? { ...c, outputs: [], hasError: false, errorSummary: null, executionCount: null }
          : c,
      ),
    }));
  },

  runCell: async (cellId) => {
    const state = get();
    const cell = state.cells.find((c) => c.id === cellId);
    if (!cell) return;
    if (cell.kind === "markdown") return; // markdown cells are rendered, not executed
    if (!state.kernelId) {
      set({ error: "No kernel is running. Restart the kernel and try again." });
      return;
    }

    // Mark running, clear previous output
    set((s) => ({
      cells: s.cells.map((c) =>
        c.id === cellId
          ? { ...c, isRunning: true, outputs: [], hasError: false, errorSummary: null }
          : c,
      ),
      kernelStatus: "busy",
    }));

    const controller = new AbortController();
    // Track the active controller so interrupt can abort it. We stash
    // it on the store via a closure variable for simplicity.
    activeExecutionController = controller;

    try {
      let finalCount: number | null = null;
      let success = true;
      let errorSummary: CellModel["errorSummary"] = null;
      const collected: OutputChunk[] = [];

      for await (const ev of api.executeStream(state.kernelId, cell.source, controller.signal)) {
        if (ev.kind === "chunk") {
          // Filter out status chunks — we don't render them as output.
          if (ev.type === "status") {
            if (typeof ev.data.execution_count === "number") {
              finalCount = ev.data.execution_count as number;
            }
            continue;
          }
          collected.push(ev);
          set((s) => ({
            cells: s.cells.map((c) =>
              c.id === cellId ? { ...c, outputs: [...c.outputs, ev] } : c,
            ),
          }));
        } else {
          // done
          success = ev.success;
          finalCount = ev.execution_count;
          if (!success) {
            errorSummary = {
              name: ev.error_name ?? "Error",
              value: ev.error_value ?? "",
              traceback: ev.traceback ?? [],
            };
          }
        }
      }

      set((s) => ({
        cells: s.cells.map((c) =>
          c.id === cellId
            ? {
                ...c,
                isRunning: false,
                executionCount: finalCount ?? c.executionCount,
                hasError: !success,
                errorSummary,
              }
            : c,
        ),
        kernelStatus: success ? "idle" : "idle",
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Execution failed";
      set((s) => ({
        cells: s.cells.map((c) =>
          c.id === cellId
            ? {
                ...c,
                isRunning: false,
                hasError: true,
                errorSummary: { name: "ExecutionError", value: message, traceback: [] },
              }
            : c,
        ),
        kernelStatus: "idle",
        error: message,
      }));
    } finally {
      activeExecutionController = null;
    }
  },

  runAll: async () => {
    const { cells } = get();
    for (const cell of cells) {
      if (cell.kind === "code") {
        await get().runCell(cell.id);
        // Stop running if a cell errored — like Jupyter's default behavior.
        const updated = get().cells.find((c) => c.id === cell.id);
        if (updated?.hasError) break;
      }
    }
  },

  setTitle: (title) => set({ title }),
}));

// Module-level holder for the currently-running execution's AbortController,
// so the interrupt button can cancel it. Kept outside the store because it's
// an imperative handle, not reactive state.
let activeExecutionController: AbortController | null = null;

export function abortActiveExecution() {
  if (activeExecutionController) {
    activeExecutionController.abort();
  }
}
