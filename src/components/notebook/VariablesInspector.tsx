"use client";

/**
 * VariablesInspector — side panel showing the kernel's globals.
 *
 * Refreshes automatically after each cell execution if the panel
 * is open. Also has a manual refresh button.
 */

import { RefreshCw, X, Variable, Box, Hash, List, Type, Database } from "lucide-react";
import { useNotebookStore } from "@/lib/notebook-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  int: Hash,
  float: Hash,
  str: Type,
  bool: Box,
  list: List,
  dict: Database,
  tuple: List,
  set: List,
  ndarray: Database,
  DataFrame: Database,
};

export function VariablesInspector() {
  const open = useNotebookStore((s) => s.variablesPanelOpen);
  const toggle = useNotebookStore((s) => s.toggleVariablesPanel);
  const variables = useNotebookStore((s) => s.variables);
  const isLoading = useNotebookStore((s) => s.isVariablesLoading);
  const refresh = useNotebookStore((s) => s.refreshVariables);
  const kernelId = useNotebookStore((s) => s.kernelId);

  if (!open) return null;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-80 flex-col border-r border-border/60 bg-background shadow-xl">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Variable className="h-4 w-4 text-emerald-500" />
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold">Variables</span>
          <span className="text-[10px] text-muted-foreground">
            {variables.length} {variables.length === 1 ? "object" : "objects"} in scope
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => refresh()}
            disabled={isLoading || !kernelId}
            title="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => toggle(false)}
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {variables.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Variable className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-[12px] text-muted-foreground">No variables yet</p>
            <p className="text-[11px] text-muted-foreground/70">
              Run a cell that defines a variable to see it here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {variables.map((v) => {
              const Icon = TYPE_ICONS[v.type] ?? Box;
              return (
                <div
                  key={v.name}
                  className="flex items-start gap-2 border-b border-border/40 px-3 py-2 hover:bg-muted/40"
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[12px] font-medium">
                        {v.name}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {v.type}
                      </span>
                      {v.size > 0 && (
                        <span className="ml-auto text-[10px] text-muted-foreground/70">
                          {formatSize(v.size)}
                        </span>
                      )}
                    </div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground/80">
                      {v.repr}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
