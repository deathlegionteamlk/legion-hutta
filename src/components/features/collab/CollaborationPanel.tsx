"use client";

/**
 * Collaboration Panel — shows simulated presence (other users in
 * the notebook) and a comments thread UI. This is a UI shell for the
 * v0.6 release; full real-time sync is a planned v0.8 feature.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFeatureStore } from "../feature-store";
import { Users, Send, Circle } from "lucide-react";

interface PresenceUser {
  id: string;
  name: string;
  color: string;
  cellId: string | null;
  active: boolean;
}

interface Comment {
  id: string;
  author: string;
  color: string;
  text: string;
  ts: number;
}

const PRESENCE: PresenceUser[] = [
  { id: "u1", name: "Alice", color: "#f43f5e", cellId: "cell-0001", active: true },
  { id: "u2", name: "Bob", color: "#3b82f6", cellId: "cell-0003", active: true },
  { id: "u3", name: "Cara", color: "#10b981", cellId: null, active: false },
];

const INITIAL_COMMENTS: Comment[] = [
  {
    id: "c1",
    author: "Alice",
    color: "#f43f5e",
    text: "Can we move the data-loading cell above the imports?",
    ts: Date.now() - 1000 * 60 * 8,
  },
  {
    id: "c2",
    author: "Bob",
    color: "#3b82f6",
    text: "Done — also dropped the deprecated pandas import.",
    ts: Date.now() - 1000 * 60 * 4,
  },
];

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function CollaborationPanel() {
  const open = useFeatureStore((s) => s.openFeatureId === "collab");
  const close = useFeatureStore((s) => s.closeFeature);
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
  const [draft, setDraft] = useState("");

  const send = () => {
    if (!draft.trim()) return;
    setComments((arr) => [
      ...arr,
      {
        id: `c${arr.length + 1}`,
        author: "You",
        color: "#8b5cf6",
        text: draft.trim(),
        ts: Date.now(),
      },
    ]);
    setDraft("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-rose-500" />
            Collaboration
            <Badge variant="secondary" className="ml-1">{PRESENCE.filter((u) => u.active).length} online</Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Live presence + comments. Real-time cell sync is on the v0.8 roadmap.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-auto -mx-1 px-1">
          {/* Presence */}
          <div>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active users
            </h3>
            <div className="space-y-1.5">
              {PRESENCE.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-card/40 px-2.5 py-1.5"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback
                      style={{ backgroundColor: u.color, color: "#fff" }}
                      className="text-[10px] font-semibold"
                    >
                      {u.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-medium">{u.name}</span>
                      {u.active && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
                          <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" />
                          active
                        </span>
                      )}
                    </div>
                    {u.cellId && (
                      <p className="text-[10px] text-muted-foreground">Viewing {u.cellId}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Comments ({comments.length})
            </h3>
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback
                      style={{ backgroundColor: c.color, color: "#fff" }}
                      className="text-[10px] font-semibold"
                    >
                      {c.author[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] font-semibold">{c.author}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.ts)}</span>
                    </div>
                    <p className="text-[12px] text-foreground/90">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-1.5">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                }}
                placeholder="Add a comment… (Cmd+Enter to send)"
                className="h-8 text-[12px]"
              />
              <Button size="sm" className="h-8 px-2.5" onClick={send} disabled={!draft.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
