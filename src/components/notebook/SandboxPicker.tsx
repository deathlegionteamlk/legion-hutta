"use client";

/**
 * SandboxPicker — dropdown for choosing the execution sandbox.
 *
 * Lists all sandboxes returned by the backend, with availability
 * indicators. Selecting a new sandbox restarts the kernel on that
 * backend.
 */

import { Cpu, Cloud, Server, ChevronDown, Check, AlertCircle } from "lucide-react";
import { useNotebookStore, type SandboxInfo } from "@/lib/notebook-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cpu: Cpu,
  cloud: Cloud,
  server: Server,
};

export function SandboxPicker() {
  const sandboxes = useNotebookStore((s) => s.sandboxes);
  const selected = useNotebookStore((s) => s.selectedSandbox);
  const selectSandbox = useNotebookStore((s) => s.selectSandbox);
  const isStarting = useNotebookStore((s) => s.isStartingKernel);

  const current = sandboxes.find((s) => s.name === selected);
  const CurrentIcon = ICONS[current?.icon ?? "cpu"] ?? Cpu;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2.5"
          disabled={isStarting}
        >
          <CurrentIcon className="h-3.5 w-3.5" />
          <span className="hidden text-[12px] sm:inline">
            {current?.display_name ?? "Select sandbox"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Execution sandbox
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sandboxes.map((sb) => (
          <SandboxItem
            key={sb.name}
            sandbox={sb}
            selected={sb.name === selected}
            onSelect={() => selectSandbox(sb.name)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SandboxItem({
  sandbox,
  selected,
  onSelect,
}: {
  sandbox: SandboxInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = ICONS[sandbox.icon] ?? Cpu;
  return (
    <DropdownMenuItem
      onClick={onSelect}
      disabled={!sandbox.available}
      className="flex flex-col items-stretch gap-1 py-2"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <div className="flex flex-1 flex-col">
          <span className="text-[12.5px] font-medium">
            {sandbox.display_name}
          </span>
          <span className="text-[10.5px] text-muted-foreground">
            {sandbox.description}
          </span>
        </div>
        {selected && <Check className="h-3.5 w-3.5 text-primary" />}
      </div>
      {!sandbox.available && (
        <div className="flex items-center gap-1.5 rounded bg-muted/60 px-2 py-1 text-[10px] text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {sandbox.unavailable_reason ?? "Unavailable"}
          </span>
        </div>
      )}
    </DropdownMenuItem>
  );
}
