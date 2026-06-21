"use client";

/**
 * CommandPalette — Ctrl+P quick actions.
 *
 * Built on shadcn's Command (cmdk) primitive. Lets users quickly:
 *  - Add code/markdown cells
 *  - Run cell / Run all
 *  - Interrupt / Restart kernel
 *  - Open AI / Variables / Outline / Find&Replace panels
 *  - Save / Open / New notebook
 *  - Export .legion / .ipynb; import file
 *  - Toggle theme, word wrap, line numbers, auto-save
 *  - Collapse / expand all cells
 *  - Show shortcuts help
 *
 * Pressing Escape or selecting an item closes the palette.
 */

import {
  Play,
  Plus,
  Square,
  RotateCcw,
  Bot,
  Variable,
  FolderOpen,
  Save,
  FileText,
  Code2,
  Sun,
  Moon,
  Cpu,
  Keyboard,
  List,
  Search,
  Download,
  Upload,
  FileJson,
  FileCode2,
  WrapText,
  ListOrdered,
  AlignJustify,
  ChevronsDownUp,
  ChevronsUpDown,
  HelpCircle,
  Copy,
  Scissors,
  ClipboardPaste,
  Merge,
  Maximize2,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useNotebookStore } from "@/lib/notebook-store";

export function CommandPalette() {
  const open = useNotebookStore((s) => s.commandPaletteOpen);
  const toggle = useNotebookStore((s) => s.toggleCommandPalette);
  const store = useNotebookStore();

  const { setTheme } = useTheme();

  const run = (fn: () => void) => {
    fn();
    toggle(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={toggle}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Cells">
          <CommandItem onSelect={() => run(() => store.addCell(store.activeCellId, "code"))}>
            <Code2 className="mr-2 h-4 w-4" />
            Add code cell below
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.addCell(store.activeCellId, "markdown"))}>
            <FileText className="mr-2 h-4 w-4" />
            Add markdown cell below
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.activeCellId && store.runCell(store.activeCellId))}>
            <Play className="mr-2 h-4 w-4" />
            Run active cell
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.runAll())}>
            <Play className="mr-2 h-4 w-4" />
            Run all cells
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.activeCellId && store.toggleCellCollapsed(store.activeCellId))}>
            <Code2 className="mr-2 h-4 w-4" />
            Toggle collapse on active cell
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.collapseAll())}>
            <ChevronsDownUp className="mr-2 h-4 w-4" />
            Collapse all code cells
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.expandAll())}>
            <ChevronsUpDown className="mr-2 h-4 w-4" />
            Expand all cells
          </CommandItem>
          <CommandSeparator />
          <CommandItem onSelect={() => run(() => store.activeCellId && store.copyCell(store.activeCellId))}>
            <Copy className="mr-2 h-4 w-4" />
            Copy active cell (Shift+C)
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.activeCellId && store.cutCell(store.activeCellId))}>
            <Scissors className="mr-2 h-4 w-4" />
            Cut active cell (Shift+X)
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.activeCellId && store.pasteCell(store.activeCellId))}>
            <ClipboardPaste className="mr-2 h-4 w-4" />
            Paste cell below (Shift+V)
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.activeCellId && store.duplicateCell(store.activeCellId))}>
            <Copy className="mr-2 h-4 w-4 opacity-60" />
            Duplicate active cell (Shift+D)
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.activeCellId && store.mergeCellDown(store.activeCellId))}>
            <Merge className="mr-2 h-4 w-4" />
            Merge with cell below (Shift+M)
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.toggleFocusMode())}>
            <Maximize2 className="mr-2 h-4 w-4" />
            Toggle focus mode (F)
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Kernel">
          <CommandItem onSelect={() => run(() => store.interruptKernel())}>
            <Square className="mr-2 h-4 w-4" />
            Interrupt kernel
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.restartKernel())}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart kernel
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.refreshVariables())}>
            <Cpu className="mr-2 h-4 w-4" />
            Refresh variables
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="AI">
          <CommandItem onSelect={() => run(() => store.toggleAiPanel(true))}>
            <Bot className="mr-2 h-4 w-4" />
            Open AI assistant
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.activeCellId && store.explainCell(store.activeCellId))}>
            <Bot className="mr-2 h-4 w-4" />
            Explain active cell
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.activeCellId && store.fixCell(store.activeCellId))}>
            <Bot className="mr-2 h-4 w-4" />
            Fix error in active cell
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => {
                const p = prompt("Describe what you want to generate:");
                if (p) void store.generateCells(p, store.activeCellId);
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Generate cells from prompt…
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Notebook">
          <CommandItem onSelect={() => run(() => store.saveCurrentNotebook())}>
            <Save className="mr-2 h-4 w-4" />
            Save notebook
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.toggleNotebooksPanel(true))}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Open notebook…
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.newNotebook())}>
            <FileText className="mr-2 h-4 w-4" />
            New notebook
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="File format">
          <CommandItem onSelect={() => run(() => store.exportLegion())}>
            <FileJson className="mr-2 h-4 w-4" />
            Export as .legion (native)
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.exportIpynb())}>
            <FileCode2 className="mr-2 h-4 w-4" />
            Export as .ipynb (Jupyter)
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.importFromFile())}>
            <Upload className="mr-2 h-4 w-4" />
            Import .legion or .ipynb…
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Panels">
          <CommandItem onSelect={() => run(() => store.toggleVariablesPanel(true))}>
            <Variable className="mr-2 h-4 w-4" />
            Show variables inspector
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.toggleAiPanel(true))}>
            <Bot className="mr-2 h-4 w-4" />
            Show AI assistant
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.toggleOutlinePanel(true))}>
            <List className="mr-2 h-4 w-4" />
            Show outline / TOC
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.toggleFindReplace(true))}>
            <Search className="mr-2 h-4 w-4" />
            Find &amp; replace…
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Editor settings">
          <CommandItem onSelect={() => run(() => store.toggleWordWrap())}>
            <WrapText className="mr-2 h-4 w-4" />
            Toggle word wrap {store.wordWrap ? "(on)" : "(off)"}
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.toggleLineNumbers())}>
            <ListOrdered className="mr-2 h-4 w-4" />
            Toggle line numbers {store.lineNumbers ? "(on)" : "(off)"}
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.toggleAutoSave())}>
            <AlignJustify className="mr-2 h-4 w-4" />
            Toggle auto-save {store.autoSaveEnabled ? "(on)" : "(off)"}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => run(() => setTheme("light"))}>
            <Sun className="mr-2 h-4 w-4" />
            Light mode
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("dark"))}>
            <Moon className="mr-2 h-4 w-4" />
            Dark mode
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Help">
          <CommandItem onSelect={() => run(() => store.toggleShortcutsHelp(true))}>
            <Keyboard className="mr-2 h-4 w-4" />
            Keyboard shortcuts
          </CommandItem>
          <CommandItem onSelect={() => run(() => window.open("/api/docs", "_blank"))}>
            <HelpCircle className="mr-2 h-4 w-4" />
            API documentation
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.exportLegion())}>
            <Download className="mr-2 h-4 w-4" />
            Download current notebook
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
