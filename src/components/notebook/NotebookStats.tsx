"use client";

/**
 * NotebookStats — modal dialog with notebook-wide statistics.
 *
 * Aggregates cell counts, source size, execution time stats, and
 * bookmark / tag summaries.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useNotebookStore } from "@/lib/notebook-store";
import { BarChart3, Clock, Code2, FileText, Star, Tag } from "lucide-react";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatMs(n: number): string {
  if (n < 1000) return `${n.toFixed(0)} ms`;
  if (n < 60_000) return `${(n / 1000).toFixed(2)} s`;
  const m = Math.floor(n / 60_000);
  const s = ((n % 60_000) / 1000).toFixed(0);
  return `${m}m ${s}s`;
}

export function NotebookStats() {
  const open = useNotebookStore((s) => s.statsOpen);
  const toggle = useNotebookStore((s) => s.toggleStats);
  const cells = useNotebookStore((s) => s.cells);
  const title = useNotebookStore((s) => s.title);

  const codeCells = cells.filter((c) => c.kind === "code");
  const mdCells = cells.filter((c) => c.kind === "markdown");
  const executed = codeCells.filter((c) => c.executionCount !== null);
  const errored = codeCells.filter((c) => c.hasError);
  const bookmarked = cells.filter((c) => c.bookmarked);
  const times = codeCells
    .map((c) => c.executionTimeMs)
    .filter((t): t is number => typeof t === "number");
  const totalChars = cells.reduce((sum, c) => sum + c.source.length, 0);
  const totalLines = cells.reduce(
    (sum, c) => sum + c.source.split("\n").length,
    0,
  );
  const totalTime = times.reduce((s, t) => s + t, 0);
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const avgTime = times.length > 0 ? totalTime / times.length : 0;

  // Aggregate tags across cells
  const tagCounts = new Map<string, number>();
  for (const c of cells) {
    for (const t of c.tags ?? []) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const tags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);

  // Slowest cell
  const slowest = codeCells
    .filter((c) => typeof c.executionTimeMs === "number")
    .sort((a, b) => (b.executionTimeMs ?? 0) - (a.executionTimeMs ?? 0))[0];

  return (
    <Dialog open={open} onOpenChange={(v) => toggle(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <BarChart3 className="h-4 w-4 text-violet-500" />
            Notebook statistics
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Live summary of <span className="font-mono">{title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat
              icon={<Code2 className="h-3.5 w-3.5 text-emerald-500" />}
              label="Code cells"
              value={codeCells.length}
            />
            <Stat
              icon={<FileText className="h-3.5 w-3.5 text-sky-500" />}
              label="Markdown"
              value={mdCells.length}
            />
            <Stat
              icon={<Star className="h-3.5 w-3.5 text-amber-500" />}
              label="Bookmarked"
              value={bookmarked.length}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Stat label="Total cells" value={cells.length} />
            <Stat label="Executed" value={executed.length} />
            <Stat label="Errors" value={errored.length} />
            <Stat label="Source lines" value={totalLines} />
            <Stat label="Source chars" value={totalChars} />
            <Stat label="Source size" value={formatBytes(totalChars)} />
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3 w-3" />
              Execution time
            </div>
            <div className="grid grid-cols-3 gap-2 text-[12px]">
              <KV k="Total" v={times.length > 0 ? formatMs(totalTime) : "—"} />
              <KV k="Average" v={times.length > 0 ? formatMs(avgTime) : "—"} />
              <KV k="Slowest" v={times.length > 0 ? formatMs(maxTime) : "—"} />
            </div>
            {slowest && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Slowest cell:{" "}
                <span className="font-mono">
                  [{slowest.executionCount ?? "?"}]
                </span>{" "}
                —{" "}
                <span className="font-mono">
                  {slowest.source.slice(0, 60).trim()}
                  {slowest.source.length > 60 ? "…" : ""}
                </span>
              </p>
            )}
          </div>

          {tags.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Tag className="h-3 w-3" />
                Tags
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(([tag, count]) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[11px]"
                  >
                    <span className="font-mono text-violet-600 dark:text-violet-300">
                      #{tag}
                    </span>
                    <span className="text-muted-foreground">×{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 text-[18px] font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {k}
      </div>
      <div className="font-mono text-[13px] font-medium tabular-nums">{v}</div>
    </div>
  );
}
