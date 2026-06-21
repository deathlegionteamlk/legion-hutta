"use client";

/**
 * Profiler Panel — line-by-line timing analysis of the last executed
 * cell. Backend integration planned for v0.7; v0.6 ships the UI shell.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useFeatureStore } from "../feature-store";
import { Gauge, Clock, Flame } from "lucide-react";

interface LineStat {
  line: number;
  hits: number;
  timeMs: number;
  perHitUs: number;
  source: string;
  hot: boolean;
}

const LINES: LineStat[] = [
  { line: 1, hits: 1, timeMs: 0.2, perHitUs: 200, source: "import numpy as np", hot: false },
  { line: 2, hits: 1, timeMs: 0.1, perHitUs: 100, source: "import pandas as pd", hot: false },
  { line: 3, hits: 1, timeMs: 0, perHitUs: 0, source: "", hot: false },
  { line: 4, hits: 1, timeMs: 45.3, perHitUs: 45300, source: 'df = pd.read_csv("data.csv")', hot: true },
  { line: 5, hits: 1, timeMs: 0, perHitUs: 0, source: "", hot: false },
  { line: 6, hits: 1, timeMs: 12.4, perHitUs: 12400, source: "arr = df.select_dtypes(float).values", hot: false },
  { line: 7, hits: 1000, timeMs: 38.7, perHitUs: 38.7, source: "for i in range(1000):", hot: true },
  { line: 8, hits: 1000, timeMs: 87.1, perHitUs: 87.1, source: "    arr[i] = arr[i] * 2 + 1", hot: true },
  { line: 9, hits: 1, timeMs: 0.5, perHitUs: 500, source: "print(arr.mean())", hot: false },
];

const TOTAL_MS = LINES.reduce((a, b) => a + b.timeMs, 0);

export function ProfilerPanel() {
  const open = useFeatureStore((s) => s.openFeatureId === "profiler");
  const close = useFeatureStore((s) => s.closeFeature);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4 text-amber-500" />
            Profiler
            <Badge variant="outline" className="text-[10px]">
              <Clock className="mr-1 h-2.5 w-2.5" />
              {TOTAL_MS.toFixed(1)}ms total
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Line-by-line timing of the last executed cell. Red lines are &gt;10ms and worth optimizing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto rounded-md border border-border/60 bg-card/40">
          <table className="w-full text-[11.5px]">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr className="text-left">
                <th className="w-12 px-2 py-1.5 font-semibold text-muted-foreground">Line</th>
                <th className="w-20 px-2 py-1.5 font-semibold text-muted-foreground text-right">Hits</th>
                <th className="w-24 px-2 py-1.5 font-semibold text-muted-foreground text-right">Time (ms)</th>
                <th className="w-24 px-2 py-1.5 font-semibold text-muted-foreground text-right">Per hit (µs)</th>
                <th className="px-2 py-1.5 font-semibold text-muted-foreground">Source</th>
              </tr>
            </thead>
            <tbody>
              {LINES.map((l) => (
                <tr
                  key={l.line}
                  className={`border-t border-border/40 ${l.hot ? "bg-rose-500/10" : ""}`}
                >
                  <td className="px-2 py-1 text-[10.5px] text-muted-foreground">{l.line}</td>
                  <td className="px-2 py-1 text-right font-mono">{l.hits.toLocaleString()}</td>
                  <td className="px-2 py-1 text-right font-mono">
                    {l.timeMs > 0 ? l.timeMs.toFixed(2) : "—"}
                  </td>
                  <td className="px-2 py-1 text-right font-mono">
                    {l.perHitUs > 0 ? l.perHitUs.toFixed(1) : "—"}
                  </td>
                  <td className="px-2 py-1 font-mono">
                    {l.hot && <Flame className="mr-1 inline h-3 w-3 text-rose-500" />}
                    {l.source || "\u00a0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline">{LINES.filter((l) => l.hot).length} hot lines</Badge>
          <span>·</span>
          <span>Tip: vectorize lines 7–8 with <code className="rounded bg-muted px-1">arr = arr * 2 + 1</code> for a ~80ms speedup.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
