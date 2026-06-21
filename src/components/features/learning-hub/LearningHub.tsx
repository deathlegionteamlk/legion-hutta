"use client";

/**
 * Learning Hub — docs, tutorials, and quickstart cards.
 * All links open the actual Legion Hutta GitHub README and docs.
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
import {
  GraduationCap,
  BookOpen,
  Rocket,
  Keyboard,
  Lightbulb,
  Code2,
  ExternalLink,
  Sparkles,
  Boxes,
} from "lucide-react";

interface Resource {
  title: string;
  description: string;
  url: string;
  category: "quickstart" | "concepts" | "advanced" | "examples";
  minutes: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const RESOURCES: Resource[] = [
  {
    title: "Quickstart: Your First Notebook",
    description: "Create a cell, run Python, see outputs. 5 minutes flat.",
    url: "https://github.com/deathlegionteamlk/legion-hutta#quickstart",
    category: "quickstart",
    minutes: 5,
    icon: Rocket,
    color: "text-rose-500",
  },
  {
    title: "The .legion File Format",
    description: "How Legion's native format works, and how to convert to/from .ipynb.",
    url: "https://github.com/deathlegionteamlk/legion-hutta#legion-format-spec",
    category: "concepts",
    minutes: 8,
    icon: BookOpen,
    color: "text-violet-500",
  },
  {
    title: "Keyboard Shortcuts",
    description: "Every shortcut, grouped by mode (edit / command).",
    url: "https://github.com/deathlegionteamlk/legion-hutta#keyboard-shortcuts",
    category: "concepts",
    minutes: 3,
    icon: Keyboard,
    color: "text-amber-500",
  },
  {
    title: "AI Assistant & `%%ai` Magic",
    description: "Chat inline, explain cells, fix errors, generate code from prompts.",
    url: "https://github.com/deathlegionteamlk/legion-hutta#ai-assistant",
    category: "concepts",
    minutes: 6,
    icon: Sparkles,
    color: "text-fuchsia-500",
  },
  {
    title: "Multi-Sandbox Execution",
    description: "Run code locally, in E2B, or in Daytona — switch on the fly.",
    url: "https://github.com/deathlegionteamlk/legion-hutta#sandboxes",
    category: "concepts",
    minutes: 7,
    icon: Boxes,
    color: "text-sky-500",
  },
  {
    title: "HuggingFace Models Catalog",
    description: "Browse 377+ models and insert load snippets with one click.",
    url: "https://github.com/deathlegionteamlk/legion-hutta#huggingface-models",
    category: "advanced",
    minutes: 10,
    icon: Boxes,
    color: "text-indigo-500",
  },
  {
    title: "Public v1 API for Agentic AIs",
    description: "Programmatic access via X-Legion-Key header — let your AI agent drive notebooks.",
    url: "https://github.com/deathlegionteamlk/legion-hutta#public-v1-api",
    category: "advanced",
    minutes: 12,
    icon: Code2,
    color: "text-emerald-500",
  },
  {
    title: "Example: Stable Diffusion XL",
    description: "Generate images with SDXL using diffusers.",
    url: "https://github.com/deathlegionteamlk/legion-hutta/tree/main/examples",
    category: "examples",
    minutes: 15,
    icon: Lightbulb,
    color: "text-pink-500",
  },
  {
    title: "Example: Llama-3.1 Chat",
    description: "Run an open LLM locally with transformers.",
    url: "https://github.com/deathlegionteamlk/legion-hutta/tree/main/examples",
    category: "examples",
    minutes: 12,
    icon: Lightbulb,
    color: "text-violet-500",
  },
  {
    title: "Example: Whisper Transcription",
    description: "Transcribe audio to text + SRT.",
    url: "https://github.com/deathlegionteamlk/legion-hutta/tree/main/examples",
    category: "examples",
    minutes: 10,
    icon: Lightbulb,
    color: "text-amber-500",
  },
  {
    title: "Example: RAG with BGE + Chroma",
    description: "Build a retrieval-augmented generation pipeline.",
    url: "https://github.com/deathlegionteamlk/legion-hutta/tree/main/examples",
    category: "examples",
    minutes: 20,
    icon: Lightbulb,
    color: "text-emerald-500",
  },
  {
    title: "Example: QLoRA Fine-tuning",
    description: "Fine-tune Llama with PEFT/LoRA on a single GPU.",
    url: "https://github.com/deathlegionteamlk/legion-hutta/tree/main/examples",
    category: "examples",
    minutes: 30,
    icon: Lightbulb,
    color: "text-rose-500",
  },
];

const CATEGORY_LABELS: Record<Resource["category"], string> = {
  quickstart: "Quickstart",
  concepts: "Concepts",
  advanced: "Advanced",
  examples: "Examples",
};

const CATEGORY_COLORS: Record<Resource["category"], string> = {
  quickstart: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  concepts: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  advanced: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  examples: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

export function LearningHub() {
  const open = useFeatureStore((s) => s.openFeatureId === "learning-hub");
  const close = useFeatureStore((s) => s.closeFeature);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4 text-emerald-500" />
            Learning Hub
            <Badge variant="secondary" className="ml-1">{RESOURCES.length} resources</Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Docs, tutorials, and curated example notebooks.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {RESOURCES.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2.5 rounded-md border border-border/60 bg-card/40 p-3 hover:border-border hover:bg-accent/40 transition-colors"
            >
              <r.icon className={`mt-0.5 h-4 w-4 ${r.color}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[r.category]}`}>
                    {CATEGORY_LABELS[r.category]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">~{r.minutes} min</span>
                </div>
                <h3 className="mt-1 text-[12.5px] font-semibold leading-tight">{r.title}</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{r.description}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </a>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
