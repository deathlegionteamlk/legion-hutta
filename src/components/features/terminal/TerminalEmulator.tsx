"use client";

/**
 * Terminal Emulator — UI shell for an embedded xterm-style terminal
 * running inside the sandbox. v0.6 ships the visual layout;
 * backend pty integration is planned for v0.7.
 */

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useFeatureStore } from "../feature-store";
import { useNotebookStore } from "@/lib/notebook-store";
import { Terminal as TerminalIcon, X } from "lucide-react";

interface Line {
  type: "input" | "output" | "error";
  text: string;
}

const INITIAL_LINES: Line[] = [
  { type: "output", text: "Legion Hutta terminal — local sandbox" },
  { type: "output", text: "Python 3.11.4 | /usr/bin/python3" },
  { type: "output", text: "Type 'help' for commands." },
  { type: "output", text: "" },
];

export function TerminalEmulator() {
  const open = useFeatureStore((s) => s.openFeatureId === "terminal");
  const close = useFeatureStore((s) => s.closeFeature);
  const sandbox = useNotebookStore((s) => s.selectedSandbox);
  const [lines, setLines] = useState<Line[]>(INITIAL_LINES);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, open]);

  const handle = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const cmd = input.trim();
    if (!cmd) return;
    const newLines: Line[] = [{ type: "input", text: `$ ${cmd}` }];
    if (cmd === "help") {
      newLines.push(
        { type: "output", text: "Available commands:" },
        { type: "output", text: "  help     — show this help" },
        { type: "output", text: "  clear    — clear the screen" },
        { type: "output", text: "  whoami   — print the current user" },
        { type: "output", text: "  pwd      — print the working directory" },
        { type: "output", text: "  ls       — list files" },
        { type: "output", text: "  python   — start a Python REPL" },
        { type: "output", text: "" },
      );
    } else if (cmd === "clear") {
      setLines([]);
      setInput("");
      return;
    } else if (cmd === "whoami") {
      newLines.push({ type: "output", text: "legion" });
    } else if (cmd === "pwd") {
      newLines.push({ type: "output", text: "/home/legion/notebook" });
    } else if (cmd === "ls") {
      newLines.push(
        { type: "output", text: "notebook.legion  data/  outputs/  requirements.txt" },
      );
    } else if (cmd.startsWith("python")) {
      newLines.push(
        { type: "output", text: "Python 3.11.4 (main, Jun  6 2024, 18:32:55) [GCC 11.4.0] on linux" },
        { type: "output", text: 'Type "help", "copyright", "credits" or "license" for more.' },
        { type: "output", text: ">>> (REPL session opened in a separate pane)" },
      );
    } else if (cmd === "exit") {
      close();
      return;
    } else {
      newLines.push({ type: "error", text: `command not found: ${cmd.split(" ")[0]}` });
    }
    setLines((arr) => [...arr, ...newLines]);
    setInput("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <TerminalIcon className="h-4 w-4 text-emerald-500" />
            Terminal
            <Badge variant="outline" className="text-[10px]">{sandbox}</Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Embedded shell in the active sandbox. Type <code className="rounded bg-muted px-1">help</code> to see commands.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="flex-1 overflow-auto rounded-md border border-border/60 bg-zinc-950 p-3 font-mono text-[11.5px] leading-relaxed"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((l, i) => (
            <div
              key={i}
              className={
                l.type === "input"
                  ? "text-emerald-400"
                  : l.type === "error"
                    ? "text-rose-400"
                    : "text-zinc-300"
              }
            >
              {l.text || "\u00a0"}
            </div>
          ))}
          <div className="flex items-center text-emerald-400">
            <span className="mr-2">$</span>
            <input
              ref={inputRef}
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handle}
              className="flex-1 bg-transparent outline-none text-zinc-100"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Press Enter to run, type <code className="rounded bg-muted px-1">clear</code> to wipe, <code className="rounded bg-muted px-1">exit</code> to close.</span>
          <button
            onClick={close}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent"
          >
            <X className="h-3 w-3" /> Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
