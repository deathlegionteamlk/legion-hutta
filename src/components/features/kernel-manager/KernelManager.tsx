"use client";

/**
 * Kernel Manager — manage multiple kernels and switch between them.
 * Lists installed kernelspecs (Python, JS, R, etc.) and shows the
 * active kernel. v0.6 supports Python only; JS/R are stubbed.
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
import { useNotebookStore } from "@/lib/notebook-store";
import { Cpu, Check, Circle, Plus, Trash2, Activity } from "lucide-react";

interface KSpec {
  name: string;
  displayName: string;
  language: string;
  version: string;
  available: boolean;
  description: string;
}

const SPECS: KSpec[] = [
  {
    name: "python3",
    displayName: "Python 3",
    language: "python",
    version: "3.11.4",
    available: true,
    description: "Default Python 3 kernel with IPython.",
  },
  {
    name: "python3-ml",
    displayName: "Python 3 (ML)",
    language: "python",
    version: "3.11.4",
    available: true,
    description: "Python 3 with PyTorch, TensorFlow, scikit-learn pre-installed.",
  },
  {
    name: "javascript",
    displayName: "JavaScript (Node)",
    language: "javascript",
    version: "Node 20",
    available: false,
    description: "Run JS cells via ijavascript. Coming in v0.7.",
  },
  {
    name: "r",
    displayName: "R",
    language: "r",
    version: "4.4.0",
    available: false,
    description: "R kernel via IRkernel. Coming in v0.8.",
  },
  {
    name: "julia",
    displayName: "Julia",
    language: "julia",
    version: "1.10",
    available: false,
    description: "Julia kernel via IJulia. Coming in v0.9.",
  },
  {
    name: "rust",
    displayName: "Rust",
    language: "rust",
    version: "1.75",
    available: false,
    description: "Rust kernel via evcxr. Coming in v1.0.",
  },
];

export function KernelManager() {
  const open = useFeatureStore((s) => s.openFeatureId === "kernel-manager");
  const close = useFeatureStore((s) => s.closeFeature);
  const activeSpec = useNotebookStore((s) => s.kernelSpec);
  const startKernel = useNotebookStore((s) => s.startKernel);

  const switchTo = (spec: KSpec) => {
    if (!spec.available) return;
    startKernel(spec.name);
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-4 w-4 text-violet-500" />
            Kernel Manager
            <Badge variant="secondary" className="ml-1">{SPECS.filter((s) => s.available).length}/{SPECS.length} available</Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Switch kernels or install new ones. Legion Hutta is language-agnostic — Python ships now, JS/R/Julia/Rust are on the roadmap.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {SPECS.map((spec) => {
            const isActive = activeSpec?.name === spec.name;
            return (
              <div
                key={spec.name}
                className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${
                  isActive
                    ? "border-violet-300 bg-violet-50/60 dark:bg-violet-950/30"
                    : "border-border/60 bg-card/40 hover:bg-accent/30"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold">{spec.displayName}</span>
                    <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{spec.name}</code>
                    <Badge variant="outline" className="text-[10px] capitalize">{spec.language}</Badge>
                    <span className="text-[10px] text-muted-foreground">v{spec.version}</span>
                    {isActive && (
                      <Badge variant="outline" className="gap-1 text-[10px] text-violet-600">
                        <Activity className="h-2.5 w-2.5" /> active
                      </Badge>
                    )}
                    {!spec.available && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        coming soon
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{spec.description}</p>
                </div>
                {spec.available && !isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-[11px]"
                    onClick={() => switchTo(spec)}
                  >
                    <Circle className="h-3 w-3" />
                    Switch
                  </Button>
                )}
                {isActive && (
                  <Badge variant="outline" className="gap-1 text-[11px] text-violet-600">
                    <Check className="h-3 w-3" /> Active
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 border-t border-border/60 pt-3">
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
            <Plus className="h-3 w-3" /> Install kernel
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
            <Trash2 className="h-3 w-3" /> Remove
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
