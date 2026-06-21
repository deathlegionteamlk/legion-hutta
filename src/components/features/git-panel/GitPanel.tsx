"use client";

/**
 * Git Panel — shows git status, diff, and commit/branch/push controls.
 * v0.6 ships the UI shell; backend git integration is a planned v0.7
 * feature.
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFeatureStore } from "../feature-store";
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  RefreshCw,
  Plus,
  Minus,
  FileEdit,
  Check,
} from "lucide-react";

interface GitFile {
  path: string;
  status: "modified" | "added" | "deleted" | "untracked";
  additions: number;
  deletions: number;
}

const FILES: GitFile[] = [
  { path: "src/components/notebook/Toolbar.tsx", status: "modified", additions: 42, deletions: 3 },
  { path: "src/lib/notebook-store.ts", status: "modified", additions: 18, deletions: 1 },
  { path: "src/components/features/git-panel/GitPanel.tsx", status: "added", additions: 124, deletions: 0 },
  { path: "examples/stable-diffusion.legion", status: "added", additions: 86, deletions: 0 },
  { path: "src/data/hf-models.ts", status: "added", additions: 6747, deletions: 0 },
  { path: "old/legacy.txt", status: "deleted", additions: 0, deletions: 24 },
  { path: "src/components/features/terminal/TerminalEmulator.tsx", status: "untracked", additions: 0, deletions: 0 },
];

const STATUS_META: Record<GitFile["status"], { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  modified: { label: "M", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", icon: FileEdit },
  added: { label: "A", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30", icon: Plus },
  deleted: { label: "D", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30", icon: Minus },
  untracked: { label: "?", color: "text-muted-foreground bg-muted", icon: FileEdit },
};

export function GitPanel() {
  const open = useFeatureStore((s) => s.openFeatureId === "git-panel");
  const close = useFeatureStore((s) => s.closeFeature);
  const [branch, setBranch] = useState("main");
  const [commitMsg, setCommitMsg] = useState("");
  const [staged, setStaged] = useState<Set<string>>(new Set());

  const toggleStage = (path: string) => {
    setStaged((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const totalAdditions = FILES.reduce((a, b) => a + b.additions, 0);
  const totalDeletions = FILES.reduce((a, b) => a + b.deletions, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-orange-500" />
            Git
            <Badge variant="outline" className="text-[10px]">{branch}</Badge>
            <Badge variant="secondary" className="text-[10px]">
              {FILES.length} changes
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Stage files, write a commit message, and push. Backend git integration ships in v0.7.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
            <GitBranch className="h-3 w-3" />
            {branch}
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
            <GitPullRequest className="h-3 w-3" />
            Pull
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
            <RefreshCw className="h-3 w-3" />
            Fetch
          </Button>
        </div>

        <div className="rounded-md border border-border/60 bg-card/40 p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Changes ({FILES.length})
            </h3>
            <div className="text-[10.5px] text-muted-foreground">
              <span className="text-emerald-600">+{totalAdditions.toLocaleString()}</span>
              {" "}
              <span className="text-rose-600">−{totalDeletions.toLocaleString()}</span>
            </div>
          </div>
          <div className="max-h-64 overflow-auto space-y-0.5">
            {FILES.map((f) => {
              const meta = STATUS_META[f.status];
              const isStaged = staged.has(f.path);
              return (
                <div
                  key={f.path}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-[11.5px] hover:bg-accent/50"
                >
                  <button
                    onClick={() => toggleStage(f.path)}
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      isStaged
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border"
                    }`}
                    aria-label="Stage"
                  >
                    {isStaged && <Check className="h-3 w-3" />}
                  </button>
                  <span className={`w-5 rounded px-1 text-center text-[10px] font-bold ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span className="flex-1 truncate font-mono">{f.path}</span>
                  <span className="text-[10px] text-emerald-600">+{f.additions}</span>
                  <span className="text-[10px] text-rose-600">−{f.deletions}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-border/60 bg-card/40 p-2">
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Commit ({staged.size} staged)
          </h3>
          <Input
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            placeholder="Commit message…"
            className="h-8 text-[12px]"
          />
          <div className="mt-1.5 flex gap-1.5">
            <Button
              size="sm"
              variant="default"
              className="h-7 gap-1.5 text-[11px]"
              disabled={!commitMsg.trim() || staged.size === 0}
            >
              <GitCommit className="h-3 w-3" />
              Commit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-[11px]"
              disabled={staged.size === 0}
            >
              <GitPullRequest className="h-3 w-3" />
              Commit &amp; Push
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
