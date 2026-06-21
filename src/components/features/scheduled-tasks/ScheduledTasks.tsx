"use client";

/**
 * Scheduled Tasks — manage cron-style notebook runs.
 * v0.6 ships the UI shell; backend scheduler is planned for v0.7.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFeatureStore } from "../feature-store";
import { CalendarClock, Plus, Play, Square, Trash2, Clock } from "lucide-react";

interface Task {
  id: string;
  name: string;
  notebook: string;
  schedule: string;
  nextRun: string;
  status: "active" | "paused";
  lastRun?: string;
  lastStatus?: "success" | "failed";
}

const INITIAL: Task[] = [
  {
    id: "t1",
    name: "Daily data refresh",
    notebook: "etl.legion",
    schedule: "0 9 * * *",
    nextRun: "tomorrow 09:00",
    status: "active",
    lastRun: "today 09:00",
    lastStatus: "success",
  },
  {
    id: "t2",
    name: "Weekly model retrain",
    notebook: "train.legion",
    schedule: "0 0 * * 0",
    nextRun: "Sun 00:00",
    status: "active",
    lastRun: "last Sun 00:00",
    lastStatus: "success",
  },
  {
    id: "t3",
    name: "Hourly metrics report",
    notebook: "report.legion",
    schedule: "0 * * * *",
    nextRun: "next hour",
    status: "paused",
  },
];

export function ScheduledTasks() {
  const open = useFeatureStore((s) => s.openFeatureId === "scheduled-tasks");
  const close = useFeatureStore((s) => s.closeFeature);
  const [tasks, setTasks] = useState<Task[]>(INITIAL);
  const [name, setName] = useState("");
  const [notebook, setNotebook] = useState("etl.legion");
  const [cron, setCron] = useState("0 9 * * *");

  const add = () => {
    if (!name.trim() || !cron.trim()) return;
    setTasks((arr) => [
      ...arr,
      {
        id: `t${arr.length + 1}`,
        name: name.trim(),
        notebook,
        schedule: cron.trim(),
        nextRun: "pending",
        status: "active",
      },
    ]);
    setName("");
    setCron("0 9 * * *");
  };

  const toggle = (id: string) => {
    setTasks((arr) =>
      arr.map((t) =>
        t.id === id ? { ...t, status: t.status === "active" ? "paused" : "active" } : t,
      ),
    );
  };

  const remove = (id: string) => {
    setTasks((arr) => arr.filter((t) => t.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-fuchsia-500" />
            Scheduled Tasks
            <Badge variant="secondary" className="ml-1">
              {tasks.filter((t) => t.status === "active").length} active
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Run notebooks on a cron schedule. Backend scheduler lands in v0.7.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border/60 bg-card/40 p-2.5">
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            New task
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Task name…"
              className="h-8 text-[12px]"
            />
            <Input
              value={notebook}
              onChange={(e) => setNotebook(e.target.value)}
              placeholder="notebook.legion"
              className="h-8 text-[12px]"
            />
            <Input
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="0 9 * * *"
              className="h-8 text-[12px] font-mono"
            />
            <Button
              size="sm"
              variant="default"
              className="h-8 gap-1.5 text-[11px]"
              onClick={add}
              disabled={!name.trim() || !cron.trim()}
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-1.5">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-card/40 p-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-semibold truncate">{t.name}</span>
                  <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{t.notebook}</code>
                  {t.status === "active" ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-600">active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">paused</Badge>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> cron <code className="font-mono">{t.schedule}</code>
                  </span>
                  <span>next: {t.nextRun}</span>
                  {t.lastRun && (
                    <span>
                      last: {t.lastRun}{" "}
                      {t.lastStatus === "success" ? (
                        <span className="text-emerald-600">✓</span>
                      ) : (
                        <span className="text-rose-600">✗</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => toggle(t.id)}
                aria-label={t.status === "active" ? "Pause" : "Resume"}
              >
                {t.status === "active" ? (
                  <Square className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => remove(t.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="py-12 text-center text-[12px] text-muted-foreground">
              No scheduled tasks yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
