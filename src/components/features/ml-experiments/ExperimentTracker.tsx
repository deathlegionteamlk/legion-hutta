"use client";

/**
 * ML Experiment Tracker — MLflow-style experiment dashboard showing
 * runs, metrics, hyperparameters, and artifacts.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useFeatureStore } from "../feature-store";
import { FlaskConical, TrendingUp, TrendingDown, Clock, Cpu } from "lucide-react";

interface Run {
  id: string;
  name: string;
  status: "completed" | "running" | "failed";
  startedAt: string;
  duration: string;
  metrics: Record<string, number>;
  params: Record<string, string>;
  model: string;
  dataset: string;
}

const RUNS: Run[] = [
  {
    id: "r1",
    name: "bold-firefly",
    status: "completed",
    startedAt: "2h ago",
    duration: "12m 34s",
    metrics: { accuracy: 0.9234, loss: 0.1243, f1: 0.9198, val_loss: 0.1401 },
    params: { lr: "0.001", batch_size: "64", epochs: "10", optimizer: "Adam" },
    model: "ResNet-50",
    dataset: "CIFAR-10",
  },
  {
    id: "r2",
    name: "quiet-breeze",
    status: "completed",
    startedAt: "5h ago",
    duration: "8m 12s",
    metrics: { accuracy: 0.8912, loss: 0.1876, f1: 0.8891, val_loss: 0.2013 },
    params: { lr: "0.01", batch_size: "32", epochs: "10", optimizer: "SGD" },
    model: "ResNet-50",
    dataset: "CIFAR-10",
  },
  {
    id: "r3",
    name: "lively-shadow",
    status: "completed",
    startedAt: "1d ago",
    duration: "23m 08s",
    metrics: { accuracy: 0.9456, loss: 0.0987, f1: 0.9432, val_loss: 0.1144 },
    params: { lr: "0.0005", batch_size: "128", epochs: "20", optimizer: "AdamW" },
    model: "ViT-Base",
    dataset: "CIFAR-10",
  },
  {
    id: "r4",
    name: "wispy-fog",
    status: "failed",
    startedAt: "2d ago",
    duration: "1m 23s",
    metrics: { accuracy: 0, loss: 0, f1: 0, val_loss: 0 },
    params: { lr: "0.5", batch_size: "256", epochs: "5", optimizer: "SGD" },
    model: "ResNet-50",
    dataset: "CIFAR-10",
  },
  {
    id: "r5",
    name: "purple-river",
    status: "running",
    startedAt: "in progress",
    duration: "4m 12s",
    metrics: { accuracy: 0.7821, loss: 0.5421, f1: 0.7734, val_loss: 0.5812 },
    params: { lr: "0.001", batch_size: "64", epochs: "10", optimizer: "Adam" },
    model: "EfficientNet-B0",
    dataset: "CIFAR-10",
  },
];

const STATUS_COLOR: Record<Run["status"], string> = {
  completed: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
  running: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  failed: "text-rose-600 bg-rose-50 dark:bg-rose-950/30",
};

function metricTrend(curr: number, prev: number, higherBetter = true) {
  const delta = curr - prev;
  if (Math.abs(delta) < 0.0001) return null;
  const better = higherBetter ? delta > 0 : delta < 0;
  return { delta, better };
}

export function ExperimentTracker() {
  const open = useFeatureStore((s) => s.openFeatureId === "ml-experiments");
  const close = useFeatureStore((s) => s.closeFeature);
  const [selId, setSelId] = useState<string | null>(RUNS[0].id);
  const sel = RUNS.find((r) => r.id === selId);
  const best = RUNS.filter((r) => r.status === "completed").reduce(
    (best, r) => (r.metrics.accuracy > (best?.metrics.accuracy ?? 0) ? r : best),
    null as Run | null,
  );
  const prev = RUNS.filter((r) => r.status === "completed").sort((a, b) => b.startedAt.localeCompare(a.startedAt))[1];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-rose-500" />
            ML Experiments
            <Badge variant="secondary" className="ml-1">{RUNS.length} runs</Badge>
            {best && (
              <Badge variant="outline" className="text-[10px] text-emerald-600">
                best: {best.name} · {(best.metrics.accuracy * 100).toFixed(2)}%
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Track runs, metrics, and hyperparameters across experiments.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1 overflow-auto">
          {/* Run list */}
          <div className="lg:col-span-2 space-y-1.5">
            {RUNS.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelId(r.id)}
                className={`w-full rounded-md border p-2 text-left transition-colors ${
                  selId === r.id
                    ? "border-foreground/40 bg-accent/50"
                    : "border-border/60 bg-card/40 hover:bg-accent/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-semibold">{r.name}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${STATUS_COLOR[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> {r.duration}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Cpu className="h-2.5 w-2.5" /> {r.model}
                  </span>
                </div>
                {r.status === "completed" && (
                  <div className="mt-1 text-[11px]">
                    <span className="font-mono">acc={(r.metrics.accuracy * 100).toFixed(2)}%</span>
                    <span className="ml-2 text-muted-foreground">loss={r.metrics.loss.toFixed(4)}</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Run detail */}
          <div className="lg:col-span-3 rounded-md border border-border/60 bg-card/40 p-3">
            {!sel && <div className="py-12 text-center text-[12px] text-muted-foreground">Select a run.</div>}
            {sel && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[13px] font-semibold">{sel.name}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {sel.model} · {sel.dataset} · started {sel.startedAt} · {sel.duration}
                    </p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[10px] ${STATUS_COLOR[sel.status]}`}>
                    {sel.status}
                  </span>
                </div>

                <h4 className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Metrics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {Object.entries(sel.metrics).map(([k, v]) => {
                    const prevVal = prev?.metrics[k];
                    const trend = prevVal != null ? metricTrend(v, prevVal, k !== "loss" && k !== "val_loss") : null;
                    return (
                      <div key={k} className="rounded-md border border-border/60 bg-background/60 p-2">
                        <div className="text-[10px] text-muted-foreground">{k}</div>
                        <div className="font-mono text-[12px] font-semibold">{v.toFixed(4)}</div>
                        {trend && (
                          <div className={`mt-0.5 inline-flex items-center gap-1 text-[10px] ${trend.better ? "text-emerald-600" : "text-rose-600"}`}>
                            {trend.better ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                            {trend.delta > 0 ? "+" : ""}{trend.delta.toFixed(4)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <h4 className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Hyperparameters
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {Object.entries(sel.params).map(([k, v]) => (
                    <div key={k} className="rounded-md border border-border/60 bg-background/60 p-2">
                      <div className="text-[10px] text-muted-foreground">{k}</div>
                      <div className="font-mono text-[12px]">{v}</div>
                    </div>
                  ))}
                </div>

                <h4 className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Artifacts
                </h4>
                <div className="space-y-1 text-[11.5px]">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-muted-foreground">📄</span> model.pt
                    <span className="ml-auto text-[10px] text-muted-foreground">448 MB</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-muted-foreground">📈</span> training_curve.png
                    <span className="ml-auto text-[10px] text-muted-foreground">42 KB</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-muted-foreground">📊</span> confusion_matrix.png
                    <span className="ml-auto text-[10px] text-muted-foreground">28 KB</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
