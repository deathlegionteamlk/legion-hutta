"use client";

/**
 * CommandPalette — Ctrl+P quick actions.
 *
 * Built on shadcn's Command (cmdk) primitive. Lets users quickly:
 *  - Add code/markdown cells
 *  - Run cell / Run all
 *  - Interrupt / Restart kernel
 *  - Open AI / Variables / Notebooks panels
 *  - Save / Open / New notebook
 *  - Toggle theme
 *  - Switch sandbox
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

        <CommandGroup heading="Panels">
          <CommandItem onSelect={() => run(() => store.toggleVariablesPanel(true))}>
            <Variable className="mr-2 h-4 w-4" />
            Show variables inspector
          </CommandItem>
          <CommandItem onSelect={() => run(() => store.toggleAiPanel(true))}>
            <Bot className="mr-2 h-4 w-4" />
            Show AI assistant
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
          <CommandItem onSelect={() => run(() => window.open("/api/docs", "_blank"))}>
            <Keyboard className="mr-2 h-4 w-4" />
            API documentation
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
