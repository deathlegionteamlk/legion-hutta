"use client";

/**
 * Workflow Builder — DAG-style pipeline canvas. Each node is a cell
 * (or a group of cells); edges define execution order. v0.6 ships the
 * visual canvas with a sample workflow.
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
  Workflow,
  Database,
  Cpu,
  Filter,
  BarChart3,
  Save,
  Play,
  GitBranch,
} from "lucide-react";

interface WfNode {
  id: string;
  label: string;
  type: "source" | "transform" | "model" | "sink";
  x: number;
  y: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface WfEdge {
  from: string;
  to: string;
}

const NODES: WfNode[] = [
  { id: "n1", label: "Load CSV", type: "source", x: 40, y: 40, icon: Database, color: "text-sky-500" },
  { id: "n2", label: "Clean &\nNormalize", type: "transform", x: 220, y: 40, icon: Filter, color: "text-amber-500" },
  { id: "n3", label: "Feature\nEngineering", type: "transform", x: 400, y: 40, icon: GitBranch, color: "text-amber-500" },
  { id: "n4", label: "Train RF", type: "model", x: 580, y: 40, icon: Cpu, color: "text-violet-500" },
  { id: "n5", label: "Evaluate", type: "transform", x: 760, y: 40, icon: Filter, color: "text-amber-500" },
  { id: "n6", label: "Plots", type: "sink", x: 760, y: 180, icon: BarChart3, color: "text-emerald-500" },
  { id: "n7", label: "Save Model", type: "sink", x: 760, y: 280, icon: Save, color: "text-emerald-500" },
];

const EDGES: WfEdge[] = [
  { from: "n1", to: "n2" },
  { from: "n2", to: "n3" },
  { from: "n3", to: "n4" },
  { from: "n4", to: "n5" },
  { from: "n5", to: "n6" },
  { from: "n5", to: "n7" },
];

const TYPE_COLOR: Record<WfNode["type"], string> = {
  source: "border-sky-300 bg-sky-50 dark:bg-sky-950/30",
  transform: "border-amber-300 bg-amber-50 dark:bg-amber-950/30",
  model: "border-violet-300 bg-violet-50 dark:bg-violet-950/30",
  sink: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30",
};

function nodeSize(n: WfNode) {
  return { w: 140, h: 56 };
}

function edgePath(from: WfNode, to: WfNode) {
  const { w: fw } = nodeSize(from);
  const { h: th } = nodeSize(to);
  const x1 = from.x + fw;
  const y1 = from.y + 28;
  const x2 = to.x;
  const y2 = to.y + th / 2;
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export function WorkflowBuilder() {
  const open = useFeatureStore((s) => s.openFeatureId === "workflows");
  const close = useFeatureStore((s) => s.closeFeature);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Workflow className="h-4 w-4 text-indigo-500" />
            Workflow Builder
            <Badge variant="secondary" className="ml-1">{NODES.length} nodes</Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Compose multi-cell pipelines as a DAG. v0.6 ships the canvas UI; backend DAG executor lands in v0.7.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="default" className="h-7 gap-1.5 text-[11px]">
            <Play className="h-3 w-3" /> Run
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
            <Save className="h-3 w-3" /> Save
          </Button>
        </div>

        <div className="flex-1 overflow-auto rounded-md border border-border/60 bg-card/30 p-2">
          <svg width="940" height="360" className="block">
            {/* Edges */}
            {EDGES.map((e, i) => {
              const from = NODES.find((n) => n.id === e.from)!;
              const to = NODES.find((n) => n.id === e.to)!;
              return (
                <path
                  key={i}
                  d={edgePath(from, to)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-muted-foreground/60"
                  markerEnd="url(#arrow)"
                />
              );
            })}
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" className="text-muted-foreground/60" />
              </marker>
            </defs>

            {/* Nodes */}
            {NODES.map((n) => {
              const { w, h } = nodeSize(n);
              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                  <foreignObject width={w} height={h}>
                    <div
                      className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border-2 px-2 py-1.5 text-center ${TYPE_COLOR[n.type]}`}
                    >
                      <n.icon className={`h-3.5 w-3.5 ${n.color}`} />
                      <div className="text-[10.5px] font-medium leading-tight">
                        {n.label.split("\n").map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" /> Source</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Transform</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" /> Model</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Sink</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
