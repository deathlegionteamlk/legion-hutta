"use client";

/**
 * Debugger Panel — UI shell for a Python pdb-style line debugger.
 *
 * Sends `breakpoint` requests to the backend (planned v0.7), and
 * shows the current line, the call stack, local variables, and
 * step controls (continue, step-over, step-into, step-out).
 *
 * For v0.6, this is a static UI demo showing the layout.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeatureStore } from "../feature-store";
import {
  Bug,
  Play,
  SkipForward,
  ArrowDownToLine,
  ArrowUpFromLine,
  Square,
} from "lucide-react";

const STACK = [
  { file: "notebook.legion", line: 12, fn: "<cell 2>" },
  { file: "notebook.legion", line: 47, fn: "train_model" },
  { file: "/usr/lib/python3.11/site-packages/torch/optim/optimizer.py", line: 381, fn: "step" },
];

const LOCALS = [
  { name: "x", type: "int", value: "6" },
  { name: "y", type: "int", value: "7" },
  { name: "model", type: "MLP", value: "MLP(in=784, hidden=128, out=10)" },
  { name: "loss", type: "Tensor", value: "tensor(0.2341, grad_fn=<NllLoss>)" },
  { name: "epoch", type: "int", value: "3" },
];

const CODE = `def train_model(X, y, epochs=10):
    model = MLP().to(device)
    opt = torch.optim.Adam(model.parameters())
    for epoch in range(epochs):
        opt.zero_grad()
        out = model(X)
        loss = F.cross_entropy(out, y)
→       loss.backward()      # <- debugger paused here
        opt.step()
    return model`;

export function DebuggerPanel() {
  const open = useFeatureStore((s) => s.openFeatureId === "debugger");
  const close = useFeatureStore((s) => s.closeFeature);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bug className="h-4 w-4 text-rose-500" />
            Debugger
            <Badge variant="outline" className="text-[10px]">paused at line 47</Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Step through Python code line by line. The v0.6 shell shows the layout — backend pdb integration ships in v0.7.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="default" className="h-7 gap-1.5 text-[11px]">
            <Play className="h-3 w-3" /> Continue
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
            <SkipForward className="h-3 w-3" /> Step over
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
            <ArrowDownToLine className="h-3 w-3" /> Step into
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
            <ArrowUpFromLine className="h-3 w-3" /> Step out
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
            <Square className="h-3 w-3" /> Stop
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 overflow-auto">
          {/* Code */}
          <div className="md:col-span-2 rounded-md border border-border/60 bg-card/40 p-2.5">
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Source
            </h3>
            <pre className="overflow-x-auto text-[11.5px] leading-relaxed font-mono">
              <code>
                {CODE.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 px-1 ${
                      line.startsWith("→")
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                        : ""
                    }`}
                  >
                    <span className="w-8 select-none text-right text-[10px] text-muted-foreground">
                      {i + 41}
                    </span>
                    <span className="whitespace-pre">{line.replace("→", " ")}</span>
                  </div>
                ))}
              </code>
            </pre>
          </div>

          {/* Stack + Locals */}
          <div className="space-y-3">
            <div className="rounded-md border border-border/60 bg-card/40 p-2.5">
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Call stack
              </h3>
              <div className="space-y-1">
                {STACK.map((f, i) => (
                  <div key={i} className={`rounded px-1.5 py-1 text-[11px] ${i === 0 ? "bg-rose-500/10" : ""}`}>
                    <div className="font-mono">{f.fn}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{f.file}:{f.line}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-card/40 p-2.5">
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Locals
              </h3>
              <div className="space-y-1">
                {LOCALS.map((v) => (
                  <div key={v.name} className="flex items-baseline gap-2 text-[11px]">
                    <code className="text-violet-600 dark:text-violet-400">{v.name}</code>
                    <span className="text-[10px] text-muted-foreground">{v.type}</span>
                    <span className="ml-auto truncate font-mono text-[10.5px]">{v.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
