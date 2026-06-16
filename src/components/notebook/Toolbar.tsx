"use client";

/**
 * Toolbar — the top bar of the notebook.
 *
 * Contains:
 *  - Legion Hutta branding / title
 *  - Notebook filename (editable)
 *  - Run All / Add cell buttons
 *  - Sandbox picker (Local / E2B / Daytona)
 *  - Kernel status pill + Interrupt / Restart
 *  - Variables inspector toggle
 *  - AI assistant toggle
 *  - Save / Open / New notebook
 *  - Export (.legion native / .ipynb interop) + Import
 *  - Command palette (Ctrl+P)
 *  - Theme toggle
 */

import {
  Play,
  Plus,
  Square,
  RotateCcw,
  Loader2,
  Skull,
  Sun,
  Moon,
  Activity,
  Save,
  Bot,
  Variable,
  FolderOpen,
  Command as CommandIcon,
  Download,
  Upload,
  FileJson,
  FileCode2,
  List,
  Search,
  WrapText,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useNotebookStore } from "@/lib/notebook-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { KernelStatus } from "@/types/notebook";
import { SandboxPicker } from "./SandboxPicker";

export function Toolbar() {
  const title = useNotebookStore((s) => s.title);
  const setTitle = useNotebookStore((s) => s.setTitle);
  const cells = useNotebookStore((s) => s.cells);
  const addCell = useNotebookStore((s) => s.addCell);
  const runAll = useNotebookStore((s) => s.runAll);
  const kernelStatus = useNotebookStore((s) => s.kernelStatus);
  const kernelSpec = useNotebookStore((s) => s.kernelSpec);
  const isStartingKernel = useNotebookStore((s) => s.isStartingKernel);
  const isConnected = useNotebookStore((s) => s.isConnected);
  const interruptKernel = useNotebookStore((s) => s.interruptKernel);
  const restartKernel = useNotebookStore((s) => s.restartKernel);
  const error = useNotebookStore((s) => s.error);
  const isSaving = useNotebookStore((s) => s.isSaving);

  const toggleAiPanel = useNotebookStore((s) => s.toggleAiPanel);
  const toggleVariablesPanel = useNotebookStore((s) => s.toggleVariablesPanel);
  const toggleNotebooksPanel = useNotebookStore((s) => s.toggleNotebooksPanel);
  const toggleCommandPalette = useNotebookStore((s) => s.toggleCommandPalette);
  const toggleOutlinePanel = useNotebookStore((s) => s.toggleOutlinePanel);
  const toggleFindReplace = useNotebookStore((s) => s.toggleFindReplace);
  const toggleWordWrap = useNotebookStore((s) => s.toggleWordWrap);
  const saveCurrentNotebook = useNotebookStore((s) => s.saveCurrentNotebook);
  const exportLegion = useNotebookStore((s) => s.exportLegion);
  const exportIpynb = useNotebookStore((s) => s.exportIpynb);
  const importFromFile = useNotebookStore((s) => s.importFromFile);
  const aiPanelOpen = useNotebookStore((s) => s.aiPanelOpen);
  const variablesPanelOpen = useNotebookStore((s) => s.variablesPanelOpen);
  const outlineOpen = useNotebookStore((s) => s.outlineOpen);
  const wordWrap = useNotebookStore((s) => s.wordWrap);
  const dirty = useNotebookStore((s) => s.dirty);

  const { setTheme } = useTheme();

  const isBusy = kernelStatus === "busy";
  const isStarting = isStartingKernel || kernelStatus === "starting";

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
        {/* Branding */}
        <div className="flex items-center gap-2.5 pr-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-foreground to-foreground/70 text-background shadow-sm">
            <Skull className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <div className="flex flex-col leading-none">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[14px] font-bold tracking-tight">Legion Hutta</span>
              <span className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:inline">
                by Death Legion Team
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground/70">
              v0.3 · better than all notebooks
            </span>
          </div>
        </div>

        <div className="mx-1 hidden h-6 w-px bg-border/60 sm:block" />

        {/* Filename */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 w-44 border-transparent bg-transparent px-2 text-[13px] font-medium hover:border-border focus-visible:border-border focus-visible:bg-background sm:w-56"
          aria-label="Notebook filename"
        />

        <div className="mx-1 hidden h-6 w-px bg-border/60 sm:block" />

        {/* Cell actions */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 px-2.5"
                onClick={() => addCell(null, "code")}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden text-[12px] sm:inline">Add Cell</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">
              Add a new code cell at the bottom
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="default"
                className="h-8 gap-1.5 px-3"
                onClick={runAll}
                disabled={isBusy || cells.length === 0}
              >
                <Play className="h-3.5 w-3.5" />
                <span className="text-[12px]">Run All</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">
              Execute every code cell in order
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Sandbox picker */}
          <SandboxPicker />

          {/* Kernel status pill */}
          <KernelPill
            status={kernelStatus}
            specName={kernelSpec?.display_name ?? null}
            isStarting={isStarting}
            isConnected={isConnected}
          />

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 px-2.5"
                  onClick={interruptKernel}
                  disabled={!isBusy}
                >
                  <Square className="h-3 w-3" />
                  <span className="hidden text-[12px] sm:inline">Interrupt</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Interrupt the running cell
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 px-2.5"
                  onClick={restartKernel}
                  disabled={isStarting}
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="hidden text-[12px] sm:inline">Restart</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Restart kernel — clears all variables
              </TooltipContent>
            </Tooltip>

            <div className="mx-0.5 hidden h-6 w-px bg-border/60 sm:block" />

            {/* Outline panel */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn("h-8 w-8", outlineOpen && "bg-accent text-accent-foreground")}
                  onClick={() => toggleOutlinePanel()}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Outline / TOC (Ctrl+Shift+O)
              </TooltipContent>
            </Tooltip>

            {/* Variables panel */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn("h-8 w-8", variablesPanelOpen && "bg-accent text-accent-foreground")}
                  onClick={() => toggleVariablesPanel()}
                >
                  <Variable className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Variables inspector (Ctrl+Shift+V)
              </TooltipContent>
            </Tooltip>

            {/* Find & replace */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => toggleFindReplace()}
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Find &amp; replace (Ctrl+H)
              </TooltipContent>
            </Tooltip>

            {/* Word wrap toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn("h-8 w-8", wordWrap && "bg-accent text-accent-foreground")}
                  onClick={() => toggleWordWrap()}
                >
                  <WrapText className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Toggle word wrap
              </TooltipContent>
            </Tooltip>

            {/* AI assistant */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-8 w-8",
                    aiPanelOpen && "bg-violet-500/15 text-violet-700 dark:text-violet-300",
                  )}
                  onClick={() => toggleAiPanel()}
                >
                  <Bot className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                AI Assistant (Ctrl+/)
              </TooltipContent>
            </Tooltip>

            {/* Save notebook (with dirty indicator) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="relative h-8 w-8"
                  onClick={() => saveCurrentNotebook()}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {dirty && !isSaving && (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                {dirty ? "Save notebook (unsaved changes)" : "Save notebook to disk (Ctrl+S)"}
              </TooltipContent>
            </Tooltip>

            {/* Open notebook */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => toggleNotebooksPanel(true)}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Open saved notebook
              </TooltipContent>
            </Tooltip>

            {/* Command palette */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => toggleCommandPalette(true)}
                >
                  <CommandIcon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Command palette (Ctrl+P)
              </TooltipContent>
            </Tooltip>

            {/* Export (.legion native + .ipynb interop) */}
            <DropdownMenu>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px]">
                    Export notebook
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Export as
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={exportLegion} className="gap-2">
                  <FileJson className="h-3.5 w-3.5 text-violet-500" />
                  <div className="flex flex-col">
                    <span className="text-[12px] font-medium">Legion (.legion)</span>
                    <span className="text-[10px] text-muted-foreground">
                      Native format — keeps sandbox + AI history
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportIpynb} className="gap-2">
                  <FileCode2 className="h-3.5 w-3.5 text-amber-500" />
                  <div className="flex flex-col">
                    <span className="text-[12px] font-medium">Jupyter (.ipynb)</span>
                    <span className="text-[10px] text-muted-foreground">
                      nbformat 4 — opens in Jupyter
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => importFromFile()}
                  className="gap-2"
                >
                  <Upload className="h-3.5 w-3.5 text-emerald-500" />
                  <div className="flex flex-col">
                    <span className="text-[12px] font-medium">Import file…</span>
                    <span className="text-[10px] text-muted-foreground">
                      Load a .legion or .ipynb from disk
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    const isDark = document.documentElement.classList.contains("dark");
                    setTheme(isDark ? "light" : "dark");
                  }}
                >
                  <Sun className="hidden h-3.5 w-3.5 dark:block" />
                  <Moon className="h-3.5 w-3.5 dark:hidden" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Toggle theme
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {error && (
        <div className="border-t border-red-400/30 bg-red-50/70 px-4 py-1.5 text-[11.5px] text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
    </header>
  );
}

function KernelPill({
  status,
  specName,
  isStarting,
  isConnected,
}: {
  status: KernelStatus | null;
  specName: string | null;
  isStarting: boolean;
  isConnected: boolean;
}) {
  if (!isConnected) {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-red-400/50 bg-red-50/50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        <span className="text-[11px] font-medium">backend offline</span>
      </Badge>
    );
  }
  if (isStarting) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-[11px] font-medium">starting…</span>
      </Badge>
    );
  }
  const color = status === "busy" ? "amber" : status === "idle" ? "emerald" : status === "dead" ? "red" : "gray";
  const dotClass = {
    amber: "bg-amber-500 animate-pulse",
    emerald: "bg-emerald-500",
    red: "bg-red-500",
    gray: "bg-gray-400",
  }[color];

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1.5 py-1 pl-2 pr-2.5">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
            <span className="text-[11px] font-medium capitalize">{status ?? "—"}</span>
            {specName && (
              <span className="ml-1 hidden border-l border-border/60 pl-1.5 text-[10px] text-muted-foreground md:inline">
                {specName}
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px]">
          Kernel status: {status ?? "no kernel"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
