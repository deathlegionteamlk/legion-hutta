"use client";

/**
 * ShortcutsHelp — modal dialog listing every keyboard shortcut in
 * Legion Hutta. Triggered via `?` (when not typing) or the command
 * palette.
 */

import { Keyboard, X } from "lucide-react";
import { useNotebookStore } from "@/lib/notebook-store";
import { Button } from "@/components/ui/button";

interface ShortcutGroup {
  title: string;
  items: Array<{ keys: string; desc: string }>;
}

const GROUPS: ShortcutGroup[] = [
  {
    title: "Running cells",
    items: [
      { keys: "Shift+Enter", desc: "Run cell and select the next cell" },
      { keys: "Ctrl+Enter", desc: "Run cell and stay on it" },
      { keys: "Alt+Enter", desc: "Run cell and insert a new cell below" },
    ],
  },
  {
    title: "Cell navigation",
    items: [
      { keys: "↑ / ↓", desc: "Move selection up / down" },
      { keys: "Enter", desc: "Enter edit mode on the selected cell" },
      { keys: "Esc", desc: "Exit edit mode" },
      { keys: "B", desc: "Insert code cell below" },
      { keys: "A", desc: "Insert code cell above" },
      { keys: "D D", desc: "Delete the selected cell (double-tap)" },
      { keys: "C", desc: "Collapse / expand the selected code cell" },
    ],
  },
  {
    title: "Cell clipboard & editing (v0.4)",
    items: [
      { keys: "Shift+C", desc: "Copy the selected cell to the clipboard" },
      { keys: "Shift+X", desc: "Cut the selected cell (copy + delete)" },
      { keys: "Shift+V", desc: "Paste the clipboard cell below the selection" },
      { keys: "Shift+D", desc: "Duplicate the selected cell" },
      { keys: "Shift+M", desc: "Merge the selected cell with the one below" },
      { keys: "Ctrl+Shift+-", desc: "Split the active cell at the cursor position" },
      { keys: "Drag", desc: "Drag a cell by its left gutter to reorder" },
    ],
  },
  {
    title: "Panels & palette",
    items: [
      { keys: "Ctrl+P", desc: "Command palette" },
      { keys: "Ctrl+/", desc: "AI Assistant panel" },
      { keys: "Ctrl+Shift+V", desc: "Variables inspector panel" },
      { keys: "Ctrl+Shift+O", desc: "Outline / table of contents panel" },
      { keys: "Ctrl+H", desc: "Find & replace across all cells" },
      { keys: "F", desc: "Toggle focus / presentation mode" },
      { keys: "?", desc: "This shortcuts dialog" },
    ],
  },
  {
    title: "Notebook",
    items: [
      { keys: "Ctrl+S", desc: "Save notebook to the database" },
      { keys: "Ctrl+Shift+E", desc: "Export as .legion (native format)" },
      { keys: "Ctrl+Shift+J", desc: "Export as .ipynb (Jupyter)" },
      { keys: "Ctrl+Shift+I", desc: "Import a .legion or .ipynb file" },
    ],
  },
];

export function ShortcutsHelp() {
  const open = useNotebookStore((s) => s.shortcutsHelpOpen);
  const toggle = useNotebookStore((s) => s.toggleShortcutsHelp);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-20 backdrop-blur-sm"
      onClick={() => toggle(false)}
    >
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border border-border/80 bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            Keyboard shortcuts
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => toggle(false)}
            aria-label="Close shortcuts help"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid max-h-[calc(80vh-3.5rem)] grid-cols-1 gap-x-8 gap-y-4 overflow-y-auto px-5 py-4 md:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.title}
              </div>
              <ul className="space-y-1">
                {g.items.map((item) => (
                  <li
                    key={item.keys}
                    className="flex items-center justify-between gap-3 text-[12px]"
                  >
                    <span className="text-muted-foreground">{item.desc}</span>
                    <kbd className="shrink-0 rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10.5px] text-foreground/90 shadow-sm">
                      {item.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
