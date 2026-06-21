"use client";

/**
 * About Dialog — version info, credits, licenses, and useful links.
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
import { Skull, Github, ExternalLink, Heart, Code2, Boxes } from "lucide-react";

const STATS = [
  { label: "Version", value: "v0.6.0" },
  { label: "HF Models", value: "377+" },
  { label: "HF Datasets", value: "138" },
  { label: "Example Notebooks", value: "16" },
  { label: "Feature Folders", value: "22" },
  { label: "Tech Stack", value: "Next.js 16 + React 19 + FastAPI" },
  { label: "License", value: "MIT" },
  { label: "Built by", value: "Death Legion Team" },
];

const CREDITS = [
  { name: "Next.js 16", url: "https://nextjs.org" },
  { name: "React 19", url: "https://react.dev" },
  { name: "Tailwind CSS", url: "https://tailwindcss.com" },
  { name: "shadcn/ui", url: "https://ui.shadcn.com" },
  { name: "Zustand", url: "https://github.com/pmndrs/zustand" },
  { name: "CodeMirror 6", url: "https://codemirror.net" },
  { name: "FastAPI", url: "https://fastapi.tiangolo.com" },
  { name: "HuggingFace Transformers", url: "https://huggingface.co/docs/transformers" },
  { name: "diffusers", url: "https://huggingface.co/docs/diffusers" },
  { name: "Lucide Icons", url: "https://lucide.dev" },
];

export function AboutDialog() {
  const open = useFeatureStore((s) => s.openFeatureId === "help-about");
  const close = useFeatureStore((s) => s.closeFeature);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-foreground to-foreground/70 text-background shadow-sm">
              <Skull className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div>
              <DialogTitle className="text-base">Legion Hutta</DialogTitle>
              <DialogDescription className="text-[12px]">
                A modern, language-agnostic web notebook — better than all notebooks.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tagline */}
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Legion Hutta is built by <span className="font-medium text-foreground">Death Legion Team</span> with
            one mission: to be a better notebook than Jupyter, Colab, and Deepnote — natively multi-language,
            AI-first, and built around an open <code className="rounded bg-muted px-1">.legion</code> file format
            that carries sandbox and AI history alongside the cells.
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-md border border-border/60 bg-card/40 p-2.5">
                <div className="text-[10.5px] text-muted-foreground">{s.label}</div>
                <div className="text-[12px] font-medium">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-2">
            <a
              href="https://github.com/deathlegionteamlk/legion-hutta"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[11.5px] hover:bg-accent"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
              <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
            </a>
            <a
              href="https://github.com/deathlegionteamlk/legion-hutta#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[11.5px] hover:bg-accent"
            >
              <Code2 className="h-3.5 w-3.5" />
              README
            </a>
            <a
              href="https://github.com/deathlegionteamlk/legion-hutta/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[11.5px] hover:bg-accent"
            >
              <Boxes className="h-3.5 w-3.5" />
              Issues
            </a>
          </div>

          {/* Credits */}
          <div>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Built with
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {CREDITS.map((c) => (
                <a
                  key={c.name}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 px-2 py-1 text-[11px] hover:bg-accent"
                >
                  {c.name}
                  <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-1.5 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
            <Heart className="h-3 w-3 text-rose-500" />
            <span>
              Made with care in Sri Lanka · © 2026 Death Legion Team · MIT License
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
