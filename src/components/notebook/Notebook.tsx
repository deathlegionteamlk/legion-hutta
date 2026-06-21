"use client";

/**
 * Notebook — the top-level notebook shell.
 *
 * Wires up:
 *  - Backend init on mount (health check + auto-start kernel + load sandboxes)
 *  - Keyboard shortcuts:
 *      Shift+Enter / Ctrl+Enter / Alt+Enter  run cell variants
 *      B / A                                  insert cell below/above
 *      D D                                    delete cell
 *      C                                      collapse/expand cell
 *      ↑ / ↓                                  navigate cells
 *      Enter                                  edit cell
 *      Esc                                    exit edit mode / close dialogs
 *      Ctrl+P                                 command palette
 *      Ctrl+/                                 AI assistant panel
 *      Ctrl+Shift+V                           variables inspector
 *      Ctrl+Shift+O                           outline / TOC
 *      Ctrl+H                                 find & replace
 *      Ctrl+S                                 save notebook
 *      Ctrl+Shift+E / J / I                   export .legion / .ipynb / import
 *      ?                                      shortcuts help
 *  - Auto-save every 30s when there's a currentNotebookId and dirty state
 *  - Renders Toolbar + Cell list + footer status
 *  - Mounts the side panels (AI, Variables, Outline) and modals
 *    (Notebooks, CommandPalette, FindReplace, ShortcutsHelp)
 */

import { useEffect } from "react";
import { useNotebookStore } from "@/lib/notebook-store";
import { cn } from "@/lib/utils";
import { Toolbar } from "./Toolbar";
import { Cell } from "./Cell";
import { Button } from "@/components/ui/button";
import { Plus, Keyboard } from "lucide-react";
import { AiAssistant } from "./AiAssistant";
import { VariablesInspector } from "./VariablesInspector";
import { NotebooksBrowser } from "./NotebooksBrowser";
import { CommandPalette } from "./CommandPalette";
import { Outline } from "./Outline";
import { FindReplace } from "./FindReplace";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { StatusBar } from "./StatusBar";

export function Notebook() {
  const cells = useNotebookStore((s) => s.cells);
  const init = useNotebookStore((s) => s.init);
  const addCell = useNotebookStore((s) => s.addCell);
  const activeCellId = useNotebookStore((s) => s.activeCellId);
  const setActiveCell = useNotebookStore((s) => s.setActiveCell);
  const runCell = useNotebookStore((s) => s.runCell);
  const removeCell = useNotebookStore((s) => s.removeCell);
  const toggleCommandPalette = useNotebookStore((s) => s.toggleCommandPalette);
  const toggleAiPanel = useNotebookStore((s) => s.toggleAiPanel);
  const toggleVariablesPanel = useNotebookStore((s) => s.toggleVariablesPanel);
  const toggleOutlinePanel = useNotebookStore((s) => s.toggleOutlinePanel);
  const toggleFindReplace = useNotebookStore((s) => s.toggleFindReplace);
  const toggleShortcutsHelp = useNotebookStore((s) => s.toggleShortcutsHelp);
  const toggleCellCollapsed = useNotebookStore((s) => s.toggleCellCollapsed);
  const saveCurrentNotebook = useNotebookStore((s) => s.saveCurrentNotebook);
  const exportLegion = useNotebookStore((s) => s.exportLegion);
  const exportIpynb = useNotebookStore((s) => s.exportIpynb);
  const importFromFile = useNotebookStore((s) => s.importFromFile);
  const aiPanelOpen = useNotebookStore((s) => s.aiPanelOpen);
  const variablesPanelOpen = useNotebookStore((s) => s.variablesPanelOpen);
  const outlineOpen = useNotebookStore((s) => s.outlineOpen);
  const focusMode = useNotebookStore((s) => s.focusMode);
  const toggleFocusMode = useNotebookStore((s) => s.toggleFocusMode);
  const copyCell = useNotebookStore((s) => s.copyCell);
  const cutCell = useNotebookStore((s) => s.cutCell);
  const pasteCell = useNotebookStore((s) => s.pasteCell);
  const duplicateCell = useNotebookStore((s) => s.duplicateCell);
  const mergeCellDown = useNotebookStore((s) => s.mergeCellDown);
  const splitCell = useNotebookStore((s) => s.splitCell);

  // Boot the backend connection + kernel on first mount.
  useEffect(() => {
    void init();
  }, [init]);

  // Auto-save every 30s if dirty + a notebook is loaded.
  useEffect(() => {
    const id = setInterval(() => {
      const s = useNotebookStore.getState();
      if (s.autoSaveEnabled && s.currentNotebookId && s.dirty && !s.isSaving) {
        void s.saveCurrentNotebook();
      }
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // Global keyboard shortcuts.
  useEffect(() => {
    let lastDPress = 0;
    const handler = (e: KeyboardEvent) => {
      // Global shortcuts that work even when editing
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "p") {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "/") {
        e.preventDefault();
        toggleAiPanel();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        toggleVariablesPanel();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        toggleOutlinePanel();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        toggleFindReplace();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        void saveCurrentNotebook();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        exportLegion();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        exportIpynb();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        void importFromFile();
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest(".cm-editor"));

      if (e.key === "Escape") {
        // Close any open modal first, otherwise blur the editor.
        const s = useNotebookStore.getState();
        if (s.findReplaceOpen) { toggleFindReplace(false); return; }
        if (s.shortcutsHelpOpen) { toggleShortcutsHelp(false); return; }
        if (s.commandPaletteOpen) { toggleCommandPalette(false); return; }
        if (s.focusMode) { toggleFocusMode(false); return; }
        if (isTyping) (target as HTMLElement).blur();
        return;
      }
      if (isTyping) return;

      // ?  -> shortcuts help
      if (e.key === "?") {
        e.preventDefault();
        toggleShortcutsHelp();
        return;
      }

      // F  -> toggle focus / presentation mode
      if (!e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        toggleFocusMode();
        return;
      }

      if (!activeCellId) return;
      const idx = cells.findIndex((c) => c.id === activeCellId);
      if (idx < 0) return;

      // v0.4: Shift+<letter> clipboard + split/merge shortcuts.
      // Must check these BEFORE the plain-letter bindings below.
      if (e.shiftKey) {
        const k = e.key.toUpperCase();
        if (k === "C") {
          e.preventDefault();
          copyCell(activeCellId);
          return;
        }
        if (k === "X") {
          e.preventDefault();
          cutCell(activeCellId);
          return;
        }
        if (k === "V") {
          e.preventDefault();
          pasteCell(activeCellId);
          return;
        }
        if (k === "D") {
          e.preventDefault();
          duplicateCell(activeCellId);
          return;
        }
        if (k === "M") {
          e.preventDefault();
          if (idx < cells.length - 1) mergeCellDown(activeCellId);
          return;
        }
      }

      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        addCell(activeCellId, "code");
        return;
      }
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        const prevId = idx > 0 ? cells[idx - 1].id : null;
        addCell(prevId, "code");
        return;
      }
      if (e.key === "d" || e.key === "D") {
        const now = Date.now();
        if (now - lastDPress < 400) {
          e.preventDefault();
          removeCell(activeCellId);
        }
        lastDPress = now;
        return;
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        toggleCellCollapsed(activeCellId);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (idx > 0) setActiveCell(cells[idx - 1].id);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (idx < cells.length - 1) setActiveCell(cells[idx + 1].id);
        return;
      }
      if (e.key === "Enter" && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const cell = cells[idx];
        const editor = document.querySelector(
          `[data-cell-id="${cell.id}"] .cm-editor`,
        ) as HTMLElement | null;
        editor?.focus();
        return;
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        runCell(activeCellId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeCellId,
    cells,
    addCell,
    removeCell,
    setActiveCell,
    runCell,
    toggleCommandPalette,
    toggleAiPanel,
    toggleVariablesPanel,
    toggleOutlinePanel,
    toggleFindReplace,
    toggleShortcutsHelp,
    toggleCellCollapsed,
    toggleFocusMode,
    saveCurrentNotebook,
    exportLegion,
    exportIpynb,
    importFromFile,
    copyCell,
    cutCell,
    pasteCell,
    duplicateCell,
    mergeCellDown,
  ]);

  // Compute padding for open side panels so content doesn't go under them.
  const leftPad = outlineOpen ? "18rem" : "0";
  const rightPad = aiPanelOpen ? "28rem" : "0";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Toolbar />

      <Outline />

      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 py-6 transition-[padding] duration-200",
          focusMode ? "max-w-3xl py-3" : "max-w-5xl",
        )}
        style={{
          paddingTop: focusMode ? "0.75rem" : "1.5rem",
          paddingLeft: `calc(${leftPad} + 1rem)`,
          paddingRight: `calc(${rightPad} + 1rem)`,
        }}
      >
        <div className="flex flex-col gap-3">
          {cells.map((cell, idx) => (
            <div key={cell.id} data-cell-id={cell.id}>
              <Cell cell={cell} index={idx} />
            </div>
          ))}
        </div>

        <div className={cn("mt-6 flex justify-center", focusMode && "hidden")}>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[12px]"
            onClick={() => addCell(cells[cells.length - 1]?.id ?? null, "code")}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Cell
          </Button>
        </div>

        {!focusMode && <KeyboardHints />}
      </main>

      <StatusBar />

      {/* Side panels */}
      <VariablesInspector />
      <AiAssistant />

      {/* Modals */}
      <NotebooksBrowser />
      <CommandPalette />
      <FindReplace />
      <ShortcutsHelp />
    </div>
  );
}

function KeyboardHints() {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Keyboard className="h-3 w-3" />
        Keyboard shortcuts
        <span className="ml-auto text-[10px] font-normal italic">
          Press <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">?</kbd> for full list
        </span>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-[11.5px] text-muted-foreground sm:grid-cols-2 md:grid-cols-3">
        <Hint k="Shift+Enter" desc="Run cell, select below" />
        <Hint k="Ctrl+Enter" desc="Run cell" />
        <Hint k="Alt+Enter" desc="Run cell, insert below" />
        <Hint k="B / A" desc="Insert cell below / above" />
        <Hint k="D D" desc="Delete cell" />
        <Hint k="C" desc="Collapse / expand cell" />
        <Hint k="Shift+C / X / V" desc="Copy / cut / paste cell" />
        <Hint k="Shift+D" desc="Duplicate cell" />
        <Hint k="Shift+M" desc="Merge with cell below" />
        <Hint k="Ctrl+Shift+-" desc="Split cell at cursor" />
        <Hint k="↑ / ↓" desc="Navigate cells" />
        <Hint k="Enter" desc="Edit cell" />
        <Hint k="Esc" desc="Exit edit / close dialog" />
        <Hint k="F" desc="Toggle focus mode" />
        <Hint k="Ctrl+P" desc="Command palette" />
        <Hint k="Ctrl+/" desc="AI assistant" />
        <Hint k="Ctrl+Shift+V" desc="Variables inspector" />
        <Hint k="Ctrl+Shift+O" desc="Outline / TOC" />
        <Hint k="Ctrl+H" desc="Find & replace" />
        <Hint k="Ctrl+S" desc="Save notebook" />
        <Hint k="?" desc="Full shortcuts list" />
      </div>
    </div>
  );
}

function Hint({ k, desc }: { k: string; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10.5px] text-foreground/80 shadow-sm">
        {k}
      </kbd>
      <span>{desc}</span>
    </div>
  );
}
