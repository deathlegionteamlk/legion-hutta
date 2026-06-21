/**
 * Notebook store.
 *
 * Holds all frontend notebook state: the cells, the attached kernel,
 * kernel status, sandbox selection, variables inspector, AI assistant
 * panel, notebook persistence, and the operations the UI can perform.
 *
 * The store is framework-agnostic; components subscribe via the
 * standard zustand hooks. All backend interaction goes through the
 * `api` client.
 */

import { create } from "zustand";
import { api } from "@/lib/notebook-api";
import {
  serializeLegion,
  parseLegion,
  ipynbToLegion,
  LEGION_EXTENSION,
  type LegionDocument,
} from "@/lib/legion-format";
import type {
  CellKind,
  CellModel,
  KernelSpec,
  KernelStatus,
  NotebookState,
  OutputChunk,
} from "@/types/notebook";

function newId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

/**
 * Deterministic ID generator for SSR-rendered initial state.
 *
 * The server and client each evaluate the module top-level once; if we
 * used `newId()` there, the IDs would differ between server-rendered
 * HTML and the client's first render, producing a hydration mismatch
 * on every `data-cell-id` attribute. Using a counter + fixed prefix
 * guarantees identical IDs on both sides.
 *
 * Runtime-created cells (addCell, insertCells) only happen after user
 * interaction, so they're always client-only and can safely use the
 * non-deterministic `newId()`.
 */
let _stableIdCounter = 0;
function stableId(prefix = "cell"): string {
  _stableIdCounter += 1;
  return `${prefix}-${_stableIdCounter.toString(36).padStart(4, "0")}`;
}

function makeCell(kind: CellKind = "code", source: string = "", id?: string): CellModel {
  return {
    id: id ?? newId(),
    kind,
    source,
    outputs: [],
    executionCount: null,
    isRunning: false,
    hasError: false,
    errorSummary: null,
    executionTimeMs: null,
    collapsed: false,
  };
}

const WELCOME_CELLS: CellModel[] = [
  makeCell(
    "markdown",
    "# Welcome to **Legion Hutta**\n\nA modern, language-agnostic notebook by *Death Legion Team* — better than all notebooks.\n\n## What's new in v0.3\n\n- **Native `.legion` file format**: save and load notebooks in Legion's own format (with sandbox + AI history). Import and export `.ipynb` for Jupyter compatibility.\n- **Multi-platform sandboxes**: run code locally, in **E2B**, or in **Daytona** — pick one from the toolbar.\n- **AI Assistant**: open the side panel (Ctrl+/) to chat, explain cells, fix errors, or generate new cells.\n- **`%%ai` magic**: prepend `%%ai` to any cell to ask the LLM a question.\n- **Variables inspector**: see live state of your kernel.\n- **Command palette** (Ctrl+P): quick actions at your fingertips.\n- **Notebook persistence**: save and load notebooks to the local DB.\n- **Public API**: programmable by AI agents via API key (`/api/v1/*`).\n\nRun the cells below to verify your kernel is alive.",
    stableId("welcome"),
  ),
  makeCell(
    "code",
    'import sys\nprint("Legion Hutta v0.3.0")\nprint(f"Python {sys.version.split()[0]} on {sys.platform}")\nprint("Death Legion Team \u2014 better than all notebooks")\n\n# State persists across cells:\nx = 6\ny = 7\n',
    stableId("welcome"),
  ),
  makeCell(
    "code",
    '# This cell reuses `x` and `y` from the previous cell.\nprint(f"x * y = {x * y}")\n\n# Try editing me and pressing Shift+Enter!\n',
    stableId("welcome"),
  ),
  makeCell(
    "markdown",
    "## Try the AI assistant\n\nPress **Ctrl+/** to open the AI side panel, or create a new cell starting with `%%ai`:\n\n```\n%%ai\nWrite a Python one-liner that returns the first 10 Fibonacci numbers.\n```\n\n## Save your work\n\nUse the **Export** button in the toolbar to download this notebook as a `.legion` file (or `.ipynb` for Jupyter). The **Import** button opens any `.legion` or `.ipynb` file from disk.\n",
    stableId("welcome"),
  ),
];

// ---- Sandbox types ----

export interface SandboxInfo {
  name: string;
  display_name: string;
  description: string;
  icon: string;
  requires_api_key: boolean;
  api_key_env_var: string | null;
  docs_url: string | null;
  available: boolean;
  unavailable_reason: string | null;
}

// ---- Variables inspector ----

export interface VariableInfo {
  name: string;
  type: string;
  repr: string;
  size: number;
}

// ---- AI assistant ----

export interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
  error?: boolean;
}

// ---- Notebooks list ----

export interface NotebookListItem {
  id: string;
  title: string;
  kernelSpec: string | null;
  sandbox: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface NotebookStore extends NotebookState {
  specs: KernelSpec[];
  defaultSpecName: string | null;
  sandboxes: SandboxInfo[];
  selectedSandbox: string;
  isConnected: boolean;
  isStartingKernel: boolean;
  error: string | null;

  // variables inspector
  variables: VariableInfo[];
  isVariablesLoading: boolean;
  variablesPanelOpen: boolean;
  refreshVariables: () => Promise<void>;
  toggleVariablesPanel: (open?: boolean) => void;

  // AI assistant
  aiPanelOpen: boolean;
  aiMessages: AiMessage[];
  aiIsStreaming: boolean;
  toggleAiPanel: (open?: boolean) => void;
  sendAiMessage: (content: string) => Promise<void>;
  clearAiMessages: () => void;
  explainCell: (cellId: string) => Promise<void>;
  fixCell: (cellId: string) => Promise<void>;
  generateCells: (prompt: string, afterCellId?: string | null) => Promise<void>;

  // notebooks list / persistence
  notebooksList: NotebookListItem[];
  notebooksPanelOpen: boolean;
  toggleNotebooksPanel: (open?: boolean) => void;
  refreshNotebooksList: () => Promise<void>;
  saveCurrentNotebook: () => Promise<void>;
  openNotebook: (id: string) => Promise<void>;
  newNotebook: () => Promise<void>;
  currentNotebookId: string | null;
  isSaving: boolean;

  // .legion / .ipynb file import + export
  exportLegion: () => void;
  exportIpynb: () => void;
  importFromFile: () => Promise<void>;
  importFromLegionJson: (json: string) => void;
  importFromIpynbJson: (json: string) => void;
  applyLegionDocument: (doc: LegionDocument) => Promise<void>;

  // command palette
  commandPaletteOpen: boolean;
  toggleCommandPalette: (open?: boolean) => void;

  // find & replace across all cells
  findReplaceOpen: boolean;
  toggleFindReplace: (open?: boolean) => void;
  findInCells: (query: string, opts?: { caseSensitive?: boolean; regex?: boolean }) => Array<{ cellId: string; matches: number }>;
  replaceInCells: (query: string, replacement: string, opts?: { caseSensitive?: boolean; regex?: boolean; all?: boolean }) => number;

  // shortcuts help dialog
  shortcutsHelpOpen: boolean;
  toggleShortcutsHelp: (open?: boolean) => void;

  // outline / TOC panel (markdown headers)
  outlineOpen: boolean;
  toggleOutlinePanel: (open?: boolean) => void;
  jumpToCell: (cellId: string) => void;

  // editor settings
  wordWrap: boolean;
  toggleWordWrap: (on?: boolean) => void;
  lineNumbers: boolean;
  toggleLineNumbers: (on?: boolean) => void;

  // per-cell collapse (hide code, show output)
  toggleCellCollapsed: (cellId: string) => void;
  collapseAll: () => void;
  expandAll: () => void;

  // cell clipboard (v0.4) — copy/cut/paste/duplicate/split/merge
  clipboard: { kind: CellKind; source: string } | null;
  copyCell: (cellId: string) => void;
  cutCell: (cellId: string) => void;
  pasteCell: (afterCellId?: string | null) => void;
  duplicateCell: (cellId: string) => void;
  splitCell: (cellId: string, position: number) => void;
  mergeCellDown: (cellId: string) => void;
  moveCellTo: (sourceId: string, targetId: string, position: "before" | "after") => void;

  // focus / presentation mode (v0.4) — hides chrome, expands cells
  focusMode: boolean;
  toggleFocusMode: (on?: boolean) => void;

  // last-saved timestamp (v0.4) — shown in the status bar
  lastSavedAt: number | null;

  // auto-save
  autoSaveEnabled: boolean;
  toggleAutoSave: (on?: boolean) => void;
  dirty: boolean;
  markDirty: () => void;

  // lifecycle
  init: () => Promise<void>;
  startKernel: (specName?: string, sandboxName?: string) => Promise<void>;
  interruptKernel: () => Promise<void>;
  restartKernel: () => Promise<void>;
  selectSandbox: (name: string) => Promise<void>;

  // cell ops
  addCell: (afterCellId?: string | null, kind?: CellKind, source?: string) => string;
  removeCell: (cellId: string) => void;
  moveCell: (cellId: string, direction: -1 | 1) => void;
  setCellSource: (cellId: string, source: string) => void;
  setActiveCell: (cellId: string | null) => void;
  setCellKind: (cellId: string, kind: CellKind) => void;
  clearCellOutput: (cellId: string) => void;
  insertCells: (cells: Array<{ kind: CellKind; source: string }>, afterCellId?: string | null) => void;

  // execution
  runCell: (cellId: string) => Promise<void>;
  runAll: () => Promise<void>;

  // utility
  setTitle: (title: string) => void;
}

export const useNotebookStore = create<NotebookStore>((set, get) => ({
  id: stableId("notebook"),
  title: "legion-hutta.legion",
  cells: WELCOME_CELLS,
  kernelId: null,
  kernelStatus: null,
  kernelSpec: null,
  activeCellId: WELCOME_CELLS[1].id,
  specs: [],
  defaultSpecName: null,
  sandboxes: [],
  selectedSandbox: "local",
  isConnected: false,
  isStartingKernel: false,
  error: null,

  variables: [],
  isVariablesLoading: false,
  variablesPanelOpen: false,

  aiPanelOpen: false,
  aiMessages: [],
  aiIsStreaming: false,

  notebooksList: [],
  notebooksPanelOpen: false,
  currentNotebookId: null,
  isSaving: false,

  // New v0.3.x UI state
  findReplaceOpen: false,
  shortcutsHelpOpen: false,
  outlineOpen: false,
  wordWrap: false,
  lineNumbers: true,
  autoSaveEnabled: true,
  dirty: false,

  // v0.4 state
  clipboard: null,
  focusMode: false,
  lastSavedAt: null,

  commandPaletteOpen: false,

  init: async () => {
    try {
      const [health, specs, existingKernels, sandboxes] = await Promise.all([
        api.health(),
        api.listKernelspecs(),
        api.listKernels(),
        api.listSandboxes(),
      ]);
      set({
        isConnected: health.status === "ok",
        specs: Object.values(specs.kernelspecs),
        defaultSpecName: specs.default,
        sandboxes: sandboxes.sandboxes,
        selectedSandbox: sandboxes.sandboxes.find((s) => s.available)?.name ?? "local",
        error: null,
      });
      const reusable = existingKernels.kernels.find(
        (k) => k.status !== "dead" && k.spec?.name === (specs.default ?? "python3"),
      );
      if (reusable) {
        set({
          kernelId: reusable.kernel_id,
          kernelStatus: reusable.status,
          kernelSpec: reusable.spec,
          selectedSandbox: reusable.sandbox?.spec?.name ?? get().selectedSandbox,
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

  startKernel: async (specName?: string, sandboxName?: string) => {
    set({ isStartingKernel: true, error: null });
    try {
      const name = specName ?? get().defaultSpecName ?? "python3";
      const sandbox = sandboxName ?? get().selectedSandbox ?? "local";
      const kernel = await api.createKernel(name, sandbox);
      set({
        kernelId: kernel.kernel_id,
        kernelStatus: kernel.status,
        kernelSpec: kernel.spec,
        isStartingKernel: false,
        selectedSandbox: sandbox,
      });
    } catch (err) {
      set({
        isStartingKernel: false,
        error: err instanceof Error ? err.message : "Failed to start kernel",
      });
    }
  },

  selectSandbox: async (name: string) => {
    set({ selectedSandbox: name });
    // Switching sandboxes requires restarting the kernel on the new backend.
    await get().startKernel(undefined, name);
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
        variables: [],
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Restart failed" });
    }
  },

  refreshVariables: async () => {
    const { kernelId } = get();
    if (!kernelId) return;
    set({ isVariablesLoading: true });
    try {
      const result = await api.getVariables(kernelId);
      set({ variables: result.variables, isVariablesLoading: false });
    } catch (err) {
      set({
        isVariablesLoading: false,
        error: err instanceof Error ? err.message : "Failed to load variables",
      });
    }
  },

  toggleVariablesPanel: (open) =>
    set((s) => ({ variablesPanelOpen: open ?? !s.variablesPanelOpen })),

  toggleAiPanel: (open) =>
    set((s) => ({ aiPanelOpen: open ?? !s.aiPanelOpen })),

  toggleCommandPalette: (open) =>
    set((s) => ({ commandPaletteOpen: open ?? !s.commandPaletteOpen })),

  toggleFindReplace: (open) =>
    set((s) => ({ findReplaceOpen: open ?? !s.findReplaceOpen })),

  toggleShortcutsHelp: (open) =>
    set((s) => ({ shortcutsHelpOpen: open ?? !s.shortcutsHelpOpen })),

  toggleOutlinePanel: (open) =>
    set((s) => ({ outlineOpen: open ?? !s.outlineOpen })),

  toggleWordWrap: (on) =>
    set((s) => ({ wordWrap: on ?? !s.wordWrap })),

  toggleLineNumbers: (on) =>
    set((s) => ({ lineNumbers: on ?? !s.lineNumbers })),

  toggleAutoSave: (on) =>
    set((s) => ({ autoSaveEnabled: on ?? !s.autoSaveEnabled })),

  markDirty: () => set({ dirty: true }),

  jumpToCell: (cellId) => {
    set({ activeCellId: cellId });
    // Scroll into view on next paint
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const el = document.querySelector(`[data-cell-id="${cellId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
  },

  toggleCellCollapsed: (cellId) => {
    set((s) => ({
      cells: s.cells.map((c) =>
        c.id === cellId ? { ...c, collapsed: !c.collapsed } : c,
      ),
    }));
  },

  collapseAll: () =>
    set((s) => ({
      cells: s.cells.map((c) => (c.kind === "code" ? { ...c, collapsed: true } : c)),
    })),

  expandAll: () =>
    set((s) => ({
      cells: s.cells.map((c) => ({ ...c, collapsed: false })),
    })),

  findInCells: (query, opts = {}) => {
    if (!query) return [];
    const { caseSensitive = false, regex = false } = opts;
    let matcher: RegExp;
    try {
      if (regex) {
        matcher = new RegExp(query, caseSensitive ? "g" : "gi");
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        matcher = new RegExp(escaped, caseSensitive ? "g" : "gi");
      }
    } catch {
      return [];
    }
    return get().cells
      .map((c) => {
        const matches = (c.source.match(matcher) || []).length;
        return matches > 0 ? { cellId: c.id, matches } : null;
      })
      .filter((x): x is { cellId: string; matches: number } => x !== null);
  },

  replaceInCells: (query, replacement, opts = {}) => {
    if (!query) return 0;
    const { caseSensitive = false, regex = false, all = true } = opts;
    let matcher: RegExp;
    try {
      if (regex) {
        matcher = new RegExp(query, caseSensitive ? "g" : "gi");
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        matcher = new RegExp(escaped, caseSensitive ? "g" : "gi");
      }
    } catch {
      return 0;
    }
    let totalReplacements = 0;
    set((s) => ({
      cells: s.cells.map((c) => {
        if (!all && totalReplacements > 0) return c;
        if (!c.source.match(matcher)) return c;
        const newSource = c.source.replace(matcher, (match) => {
          totalReplacements += 1;
          return replacement;
        });
        return { ...c, source: newSource };
      }),
      dirty: true,
    }));
    return totalReplacements;
  },

  toggleNotebooksPanel: (open) => {
    set((s) => ({ notebooksPanelOpen: open ?? !s.notebooksPanelOpen }));
    if (open || (!open && get().notebooksPanelOpen)) {
      // Refresh list when opening
    }
    if (open) {
      void get().refreshNotebooksList();
    }
  },

  sendAiMessage: async (content: string) => {
    if (!content.trim()) return;
    const userMsg: AiMessage = { id: newId(), role: "user", content };
    const assistantMsg: AiMessage = {
      id: newId(),
      role: "assistant",
      content: "",
      streaming: true,
    };
    set((s) => ({
      aiMessages: [...s.aiMessages, userMsg, assistantMsg],
      aiIsStreaming: true,
    }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content }],
          context: buildAiContext(get()),
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`AI chat failed: ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        set((s) => ({
          aiMessages: s.aiMessages.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m,
          ),
        }));
      }
      set((s) => ({
        aiMessages: s.aiMessages.map((m) =>
          m.id === assistantMsg.id ? { ...m, streaming: false } : m,
        ),
        aiIsStreaming: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI request failed";
      set((s) => ({
        aiMessages: s.aiMessages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, streaming: false, error: true, content: m.content || `[ERROR: ${message}]` }
            : m,
        ),
        aiIsStreaming: false,
      }));
    }
  },

  clearAiMessages: () => set({ aiMessages: [] }),

  explainCell: async (cellId: string) => {
    const cell = get().cells.find((c) => c.id === cellId);
    if (!cell) return;
    set({ aiPanelOpen: true });
    const prompt = `Explain this code:\n\n\`\`\`python\n${cell.source}\n\`\`\``;
    await get().sendAiMessage(prompt);
  },

  fixCell: async (cellId: string) => {
    const cell = get().cells.find((c) => c.id === cellId);
    if (!cell || !cell.errorSummary) return;
    set({ aiPanelOpen: true });
    const prompt = `Fix this error.\n\nCode:\n\`\`\`python\n${cell.source}\n\`\`\`\n\nError: ${cell.errorSummary.name}: ${cell.errorSummary.value}`;
    await get().sendAiMessage(prompt);
  },

  generateCells: async (prompt: string, afterCellId?: string | null) => {
    set({ aiIsStreaming: true, error: null });
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context: buildAiContext(get()) }),
      });
      if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
      const data = (await res.json()) as {
        cells: Array<{ kind: CellKind; source: string }>;
      };
      get().insertCells(data.cells, afterCellId ?? get().activeCellId);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Generate failed",
      });
    } finally {
      set({ aiIsStreaming: false });
    }
  },

  refreshNotebooksList: async () => {
    try {
      const res = await fetch("/api/notebooks");
      if (!res.ok) throw new Error(`List failed: ${res.status}`);
      const data = (await res.json()) as { notebooks: NotebookListItem[] };
      set({ notebooksList: data.notebooks });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to list notebooks",
      });
    }
  },

  saveCurrentNotebook: async () => {
    const { cells, title, currentNotebookId } = get();
    set({ isSaving: true });
    try {
      let id = currentNotebookId;
      if (id) {
        const res = await fetch(`/api/notebooks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cells, title }),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      } else {
        const res = await fetch("/api/notebooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            kernelSpec: get().kernelSpec?.name ?? "python3",
            sandbox: get().selectedSandbox,
            cells,
          }),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        const data = (await res.json()) as { notebook: { id: string } };
        id = data.notebook.id;
        set({ currentNotebookId: id });
      }
      set({ isSaving: false, error: null, dirty: false, lastSavedAt: Date.now() });
      void get().refreshNotebooksList();
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : "Failed to save notebook",
      });
    }
  },

  openNotebook: async (id: string) => {
    try {
      const res = await fetch(`/api/notebooks/${id}`);
      if (!res.ok) throw new Error(`Open failed: ${res.status}`);
      const data = (await res.json()) as {
        notebook: {
          id: string;
          title: string;
          kernelSpec: string | null;
          sandbox: string | null;
          cells: CellModel[];
        };
      };
      const nb = data.notebook;
      // Re-id cells so React keys are stable
      const cells = nb.cells.map((c) => ({
        ...c,
        id: newId(),
        isRunning: false,
        executionTimeMs: c.executionTimeMs ?? null,
        collapsed: c.collapsed ?? false,
      }));
      set({
        currentNotebookId: nb.id,
        title: nb.title,
        cells,
        activeCellId: cells[0]?.id ?? null,
        notebooksPanelOpen: false,
        // Reset outputs since the kernel state doesn't match the loaded notebook
        kernelId: null,
        kernelStatus: null,
      });
      // Start a fresh kernel for the loaded notebook
      const sandboxName = nb.sandbox ?? get().selectedSandbox;
      await get().startKernel(nb.kernelSpec ?? undefined, sandboxName);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to open notebook",
      });
    }
  },

  newNotebook: async () => {
    set({
      currentNotebookId: null,
      title: "untitled.legion",
      cells: [makeCell("code", "")],
      activeCellId: null,
      notebooksPanelOpen: false,
      variables: [],
      aiMessages: [],
    });
    if (!get().kernelId) {
      await get().startKernel();
    }
  },

  exportLegion: () => {
    const state = get();
    const doc = serializeLegion({
      title: state.title,
      cells: state.cells,
      kernelSpec: state.kernelSpec,
      sandbox: state.selectedSandbox,
      aiMessages: state.aiMessages,
    });
    const blob = new Blob([JSON.stringify(doc, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = state.title || "notebook";
    a.download = name.endsWith(LEGION_EXTENSION)
      ? name
      : `${name.replace(/\.(legion|ipynb)$/, "")}${LEGION_EXTENSION}`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportIpynb: () => {
    const state = get();
    const doc = serializeLegion({
      title: state.title,
      cells: state.cells,
      kernelSpec: state.kernelSpec,
      sandbox: state.selectedSandbox,
      aiMessages: state.aiMessages,
    });
    // Inline .ipynb conversion (avoids extra imports in components).
    // We re-import here to keep the store as the single entry point.
    import("@/lib/legion-format").then(({ legionToIpynb }) => {
      const ipynb = legionToIpynb(doc);
      const blob = new Blob([JSON.stringify(ipynb, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const name = state.title || "notebook";
      a.download = name.endsWith(".ipynb")
        ? name
        : `${name.replace(/\.(legion|ipynb)$/, "")}.ipynb`;
      a.click();
      URL.revokeObjectURL(url);
    });
  },

  importFromFile: async () => {
    const { pickAndLoadNotebookFile } = await import("@/lib/legion-format");
    let doc: LegionDocument | null;
    try {
      doc = await pickAndLoadNotebookFile();
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? `Import failed: ${err.message}`
            : "Import failed",
      });
      return;
    }
    if (!doc) return; // user cancelled
    get().applyLegionDocument(doc);
  },

  importFromLegionJson: (json: string) => {
    let doc: LegionDocument;
    try {
      doc = parseLegion(json);
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? `Invalid .legion file: ${err.message}`
            : "Invalid .legion file",
      });
      return;
    }
    get().applyLegionDocument(doc);
  },

  importFromIpynbJson: (json: string) => {
    let doc: LegionDocument;
    try {
      doc = ipynbToLegion(json);
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? `Invalid .ipynb file: ${err.message}`
            : "Invalid .ipynb file",
      });
      return;
    }
    get().applyLegionDocument(doc);
  },

  applyLegionDocument: async (doc) => {
    // Re-id cells so React keys are stable and never collide with old state.
    const cells: CellModel[] = doc.cells.map((c) => ({
      id: newId(),
      kind: c.kind,
      source: c.source,
      outputs: c.outputs,
      executionCount: c.execution_count,
      isRunning: false,
      hasError: c.outputs.some((o) => o.type === "error"),
      errorSummary: null,
      executionTimeMs: null,
      collapsed: false,
    }));
    const title = doc.metadata.title || "untitled.legion";
    set({
      currentNotebookId: null,
      title,
      cells,
      activeCellId: cells[0]?.id ?? null,
      aiMessages: (doc.ai_history ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
      // Outputs are stale relative to any live kernel — reset kernel state.
      kernelId: null,
      kernelStatus: null,
      variables: [],
      error: null,
      dirty: false,
    });
    // Start a fresh kernel matching the document's sandbox + kernel spec
    // (best-effort — fall back to defaults if missing).
    const sandboxName = doc.metadata.sandbox ?? get().selectedSandbox;
    const kernelName = doc.metadata.kernel?.name ?? undefined;
    try {
      await get().startKernel(kernelName, sandboxName);
    } catch {
      // Fall back to default kernel if the doc's spec isn't available.
      await get().startKernel();
    }
  },

  addCell: (afterCellId, kind = "code", source = "") => {
    const cell = makeCell(kind, source);
    set((s) => {
      const idx = afterCellId ? s.cells.findIndex((c) => c.id === afterCellId) : s.cells.length - 1;
      const cells = [...s.cells];
      cells.splice(idx + 1, 0, cell);
      return { cells, activeCellId: cell.id };
    });
    return cell.id;
  },

  insertCells: (newCells, afterCellId) => {
    set((s) => {
      const idx = afterCellId ? s.cells.findIndex((c) => c.id === afterCellId) : s.cells.length - 1;
      const cells = [...s.cells];
      const mapped = newCells.map((c) => makeCell(c.kind, c.source));
      cells.splice(idx + 1, 0, ...mapped);
      return { cells, activeCellId: mapped[0]?.id ?? s.activeCellId };
    });
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
      dirty: true,
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

  // ---- v0.4: cell clipboard, split/merge, drag-to-reorder, focus mode ----

  copyCell: (cellId) => {
    const cell = get().cells.find((c) => c.id === cellId);
    if (!cell) return;
    set({ clipboard: { kind: cell.kind, source: cell.source } });
  },

  cutCell: (cellId) => {
    const cell = get().cells.find((c) => c.id === cellId);
    if (!cell) return;
    set({ clipboard: { kind: cell.kind, source: cell.source } });
    get().removeCell(cellId);
  },

  pasteCell: (afterCellId) => {
    const clip = get().clipboard;
    if (!clip) return;
    get().addCell(afterCellId ?? null, clip.kind, clip.source);
  },

  duplicateCell: (cellId) => {
    const cell = get().cells.find((c) => c.id === cellId);
    if (!cell) return;
    const dup = makeCell(cell.kind, cell.source);
    // Preserve execution metadata so a duplicated run-time cell looks the same
    // (outputs are NOT copied — they're kernel-specific).
    dup.executionCount = cell.executionCount;
    dup.collapsed = cell.collapsed;
    set((s) => {
      const idx = s.cells.findIndex((c) => c.id === cellId);
      if (idx < 0) return s;
      const cells = [...s.cells];
      cells.splice(idx + 1, 0, dup);
      return { cells, activeCellId: dup.id, dirty: true };
    });
  },

  splitCell: (cellId, position) => {
    set((s) => {
      const idx = s.cells.findIndex((c) => c.id === cellId);
      if (idx < 0) return s;
      const cell = s.cells[idx];
      const src = cell.source;
      const pos = Math.max(0, Math.min(position, src.length));
      // Trim leading newline on the second half so the split feels clean.
      let firstHalf = src.slice(0, pos);
      let secondHalf = src.slice(pos);
      // If the split point is mid-line, push the remainder to the new cell.
      if (firstHalf && !firstHalf.endsWith("\n")) {
        const lastNl = firstHalf.lastIndexOf("\n");
        if (lastNl >= 0) {
          secondHalf = firstHalf.slice(lastNl + 1) + secondHalf;
          firstHalf = firstHalf.slice(0, lastNl + 1);
        } else {
          secondHalf = firstHalf + secondHalf;
          firstHalf = "";
        }
      }
      secondHalf = secondHalf.replace(/^\n+/, "");
      const newCell = makeCell(cell.kind, secondHalf);
      const cells = [...s.cells];
      cells[idx] = { ...cell, source: firstHalf };
      cells.splice(idx + 1, 0, newCell);
      return { cells, activeCellId: newCell.id, dirty: true };
    });
  },

  mergeCellDown: (cellId) => {
    set((s) => {
      const idx = s.cells.findIndex((c) => c.id === cellId);
      if (idx < 0 || idx >= s.cells.length - 1) return s;
      const cur = s.cells[idx];
      const next = s.cells[idx + 1];
      // Only merge same-kind cells. For mixed kinds, convert both to code.
      const mergedKind: CellKind = cur.kind === next.kind ? cur.kind : "code";
      const joiner = cur.source.endsWith("\n") || cur.source === "" ? "" : "\n";
      const mergedSource = cur.source + joiner + next.source;
      const merged: CellModel = {
        ...cur,
        kind: mergedKind,
        source: mergedSource,
        // Preserve the richer outputs/error state of whichever cell had any.
        outputs: next.outputs.length > cur.outputs.length ? next.outputs : cur.outputs,
        hasError: cur.hasError || next.hasError,
        errorSummary: next.errorSummary ?? cur.errorSummary,
        executionCount: next.executionCount ?? cur.executionCount,
        executionTimeMs: next.executionTimeMs ?? cur.executionTimeMs,
      };
      const cells = [...s.cells];
      cells.splice(idx, 2, merged);
      return { cells, activeCellId: merged.id, dirty: true };
    });
  },

  moveCellTo: (sourceId, targetId, position) => {
    if (sourceId === targetId) return;
    set((s) => {
      const cells = [...s.cells];
      const srcIdx = cells.findIndex((c) => c.id === sourceId);
      const tgtIdx = cells.findIndex((c) => c.id === targetId);
      if (srcIdx < 0 || tgtIdx < 0) return s;
      const [moved] = cells.splice(srcIdx, 1);
      // Recompute target index after removal.
      const newTgtIdx = cells.findIndex((c) => c.id === targetId);
      const insertAt = position === "before" ? newTgtIdx : newTgtIdx + 1;
      cells.splice(insertAt, 0, moved);
      return { cells, dirty: true };
    });
  },

  toggleFocusMode: (on) =>
    set((s) => ({ focusMode: typeof on === "boolean" ? on : !s.focusMode })),

  runCell: async (cellId) => {
    const state = get();
    const cell = state.cells.find((c) => c.id === cellId);
    if (!cell) return;
    if (cell.kind === "markdown") return;
    if (!state.kernelId) {
      set({ error: "No kernel is running. Restart the kernel and try again." });
      return;
    }

    set((s) => ({
      cells: s.cells.map((c) =>
        c.id === cellId
          ? { ...c, isRunning: true, outputs: [], hasError: false, errorSummary: null, executionTimeMs: null }
          : c,
      ),
      kernelStatus: "busy",
    }));

    const controller = new AbortController();
    activeExecutionController = controller;
    const startedAt = performance.now();

    try {
      let finalCount: number | null = null;
      let success = true;
      let errorSummary: CellModel["errorSummary"] = null;

      for await (const ev of api.executeStream(state.kernelId, cell.source, controller.signal)) {
        if (ev.kind === "chunk") {
          if (ev.type === "status") {
            if (typeof ev.data.execution_count === "number") {
              finalCount = ev.data.execution_count as number;
            }
            continue;
          }
          set((s) => ({
            cells: s.cells.map((c) =>
              c.id === cellId ? { ...c, outputs: [...c.outputs, ev] } : c,
            ),
          }));
        } else {
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

      const elapsed = performance.now() - startedAt;
      set((s) => ({
        cells: s.cells.map((c) =>
          c.id === cellId
            ? {
                ...c,
                isRunning: false,
                executionCount: finalCount ?? c.executionCount,
                hasError: !success,
                errorSummary,
                executionTimeMs: elapsed,
              }
            : c,
        ),
        kernelStatus: "idle",
      }));
      // Auto-refresh variables if the panel is open.
      if (get().variablesPanelOpen) {
        void get().refreshVariables();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Execution failed";
      const elapsed = performance.now() - startedAt;
      set((s) => ({
        cells: s.cells.map((c) =>
          c.id === cellId
            ? {
                ...c,
                isRunning: false,
                hasError: true,
                errorSummary: { name: "ExecutionError", value: message, traceback: [] },
                executionTimeMs: elapsed,
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
        const updated = get().cells.find((c) => c.id === cell.id);
        if (updated?.hasError) break;
      }
    }
  },

  setTitle: (title) => set({ title }),
}));

// ---- Helpers ----

let activeExecutionController: AbortController | null = null;

export function abortActiveExecution() {
  if (activeExecutionController) {
    activeExecutionController.abort();
  }
}

/**
 * Build a compact JSON context string for the AI assistant. Includes
 * kernel status, variables, and the last few cells (source only).
 */
function buildAiContext(state: NotebookStore): string {
  const recentCells = state.cells.slice(-6).map((c, i) => ({
    index: state.cells.length - 6 + i,
    kind: c.kind,
    source: c.source.slice(0, 500),
    hasError: c.hasError,
    executionCount: c.executionCount,
  }));
  return JSON.stringify({
    kernel: {
      status: state.kernelStatus,
      spec: state.kernelSpec?.name ?? null,
      sandbox: state.selectedSandbox,
      execution_count: state.cells.filter((c) => c.executionCount !== null).length,
    },
    variables: state.variables.slice(0, 30),
    recentCells,
  });
}
