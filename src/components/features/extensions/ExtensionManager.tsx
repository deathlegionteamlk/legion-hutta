"use client";

/**
 * Extensions Manager — shows a static list of "installed extensions"
 * with toggle switches. Each extension represents a category of
 * functionality that could be added to Legion Hutta (e.g. a Jupyter
 * compatibility shim, a HuggingFace Spaces publisher, etc.).
 *
 * State is in-memory only; persisted-state is a TODO for v0.7.
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
import { Switch } from "@/components/ui/switch";
import { useFeatureStore } from "../feature-store";
import { Puzzle, Check } from "lucide-react";

interface Ext {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
  builtin: boolean;
}

const INITIAL: Ext[] = [
  {
    id: "jupyter-interop",
    name: "Jupyter Interop",
    description: "Read & write .ipynb files (nbformat 4) — round-trip with JupyterLab.",
    version: "1.0.0",
    author: "Death Legion Team",
    enabled: true,
    builtin: true,
  },
  {
    id: "huggingface",
    name: "HuggingFace Hub",
    description: "Browse 377+ models and 138 datasets, insert load snippets.",
    version: "1.2.0",
    author: "Death Legion Team",
    enabled: true,
    builtin: true,
  },
  {
    id: "ai-assistant",
    name: "AI Assistant",
    description: "Inline LLM panel + `%%ai` magic + cell fix/explain.",
    version: "1.1.0",
    author: "Death Legion Team",
    enabled: true,
    builtin: true,
  },
  {
    id: "examples-gallery",
    name: "Examples Gallery",
    description: "16 curated .legion notebooks (SDXL, Llama, Whisper, etc.).",
    version: "1.0.0",
    author: "Death Legion Team",
    enabled: true,
    builtin: true,
  },
  {
    id: "multi-sandbox",
    name: "Multi-Sandbox",
    description: "Local + E2B + Daytona sandboxes with hot-swapping.",
    version: "1.0.0",
    author: "Death Legion Team",
    enabled: true,
    builtin: true,
  },
  {
    id: "drag-and-drop",
    name: "Cell Drag & Drop",
    description: "Reorder cells with HTML5 drag and drop.",
    version: "1.0.0",
    author: "Death Legion Team",
    enabled: true,
    builtin: true,
  },
  {
    id: "bookmarks",
    name: "Cell Bookmarks & Tags",
    description: "Star cells, tag them, and see them in the outline.",
    version: "1.0.0",
    author: "Death Legion Team",
    enabled: true,
    builtin: true,
  },
  {
    id: "snippets",
    name: "Snippets Library",
    description: "10 curated snippets grouped into 4 categories.",
    version: "1.0.0",
    author: "Death Legion Team",
    enabled: true,
    builtin: true,
  },
  {
    id: "stats",
    name: "Notebook Statistics",
    description: "Aggregate cell/source/time/tag counts in a modal.",
    version: "1.0.0",
    author: "Death Legion Team",
    enabled: true,
    builtin: true,
  },
  {
    id: "plotly",
    name: "Plotly Renderer",
    description: "Render plotly figure JSON inline in cell outputs.",
    version: "0.4.0",
    author: "community",
    enabled: false,
    builtin: false,
  },
  {
    id: "jupyterlab-theme",
    name: "JupyterLab Theme",
    description: "Apply a JupyterLab-like color scheme.",
    version: "0.2.1",
    author: "community",
    enabled: false,
    builtin: false,
  },
  {
    id: "vim-bindings",
    name: "Vim Bindings",
    description: "Vim-style modal editing in the code editor.",
    version: "0.3.0",
    author: "community",
    enabled: false,
    builtin: false,
  },
];

export function ExtensionManager() {
  const open = useFeatureStore((s) => s.openFeatureId === "extensions");
  const close = useFeatureStore((s) => s.closeFeature);
  const [exts, setExts] = useState<Ext[]>(INITIAL);

  const toggle = (id: string) => {
    setExts((arr) =>
      arr.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)),
    );
  };

  const enabledCount = exts.filter((e) => e.enabled).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Puzzle className="h-4 w-4 text-indigo-500" />
            Extensions
            <Badge variant="secondary" className="ml-1">
              {enabledCount}/{exts.length} enabled
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Builtin extensions ship with Legion Hutta. Community extensions can be toggled on/off.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {exts.map((e) => (
            <div
              key={e.id}
              className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-card/40 p-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-semibold">{e.name}</span>
                  <code className="rounded bg-muted px-1 py-0.5 text-[10px]">v{e.version}</code>
                  {e.builtin && (
                    <Badge variant="outline" className="text-[10px]">builtin</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{e.description}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">by {e.author}</p>
              </div>
              <div className="flex items-center gap-2">
                {e.enabled && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                <Switch
                  checked={e.enabled}
                  onCheckedChange={() => toggle(e.id)}
                  disabled={e.builtin}
                  aria-label={`Toggle ${e.name}`}
                />
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
