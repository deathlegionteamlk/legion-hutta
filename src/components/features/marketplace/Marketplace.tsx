"use client";

/**
 * Marketplace — browse community-submitted notebooks & extensions.
 * v0.6 ships a static catalog; community uploads land in v0.8.
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
  Store,
  Search,
  Download,
  Star,
  ExternalLink,
  Tag,
} from "lucide-react";

interface Item {
  id: string;
  title: string;
  author: string;
  description: string;
  kind: "notebook" | "extension" | "template";
  downloads: number;
  stars: number;
  tags: string[];
  url: string;
}

const ITEMS: Item[] = [
  {
    id: "m1",
    title: "Stock Price Forecasting",
    author: "@quant_dude",
    description: "LSTM-based stock prediction with Yahoo Finance data + Plotly charts.",
    kind: "notebook",
    downloads: 12453,
    stars: 421,
    tags: ["lstm", "pytorch", "finance"],
    url: "#",
  },
  {
    id: "m2",
    title: "PDF Chat with RAG",
    author: "@ai_dev",
    description: "Upload PDFs, chunk, embed, and chat with the document via Llama-3.",
    kind: "notebook",
    downloads: 9821,
    stars: 387,
    tags: ["rag", "llama", "pdf"],
    url: "#",
  },
  {
    id: "m3",
    title: "Vim Bindings",
    author: "@hjkl",
    description: "Vim-style modal editing in the Legion code editor.",
    kind: "extension",
    downloads: 4521,
    stars: 198,
    tags: ["vim", "editor"],
    url: "#",
  },
  {
    id: "m4",
    title: "JupyterLab Theme",
    author: "@jupyter_fan",
    description: "Apply the JupyterLab dark theme to Legion Hutta.",
    kind: "extension",
    downloads: 3210,
    stars: 142,
    tags: ["theme", "jupyter"],
    url: "#",
  },
  {
    id: "m5",
    title: "ML Pipeline Template",
    author: "@ml_engineer",
    description: "Train, evaluate, and ship a model in 12 cells. Pre-wired metrics.",
    kind: "template",
    downloads: 7842,
    stars: 312,
    tags: ["ml", "template", "sklearn"],
    url: "#",
  },
  {
    id: "m6",
    title: "Web Scraper Toolkit",
    author: "@scraper",
    description: "BeautifulSoup + Playwright starter with rotating proxies.",
    kind: "notebook",
    downloads: 5634,
    stars: 224,
    tags: ["scraping", "bs4", "playwright"],
    url: "#",
  },
  {
    id: "m7",
    title: "Stable Diffusion Playground",
    author: "@diffusion_art",
    description: "Interactive UI for SDXL with prompt history and grid output.",
    kind: "notebook",
    downloads: 18234,
    stars: 891,
    tags: ["sdxl", "diffusers", "ui"],
    url: "#",
  },
  {
    id: "m8",
    title: "Time Series Anomaly Detection",
    author: "@data_scientist",
    description: "Isolation Forest + Prophet for unsupervised anomaly detection.",
    kind: "notebook",
    downloads: 4321,
    stars: 178,
    tags: ["time-series", "prophet", "anomaly"],
    url: "#",
  },
];

const KIND_COLORS: Record<Item["kind"], string> = {
  notebook: "text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-300",
  extension: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-300",
  template: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300",
};

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

export function Marketplace() {
  const open = useFeatureStore((s) => s.openFeatureId === "marketplace");
  const close = useFeatureStore((s) => s.closeFeature);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Item["kind"] | "all">("all");

  const results = ITEMS.filter((i) => {
    if (kind !== "all" && i.kind !== kind) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)) ||
        i.author.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4 text-fuchsia-500" />
            Marketplace
            <Badge variant="secondary" className="ml-1">{ITEMS.length} items</Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Community notebooks, extensions, and templates. Community uploads land in v0.8.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search marketplace…"
              className="h-8 pl-8 text-[12px]"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "notebook", "extension", "template"] as const).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={kind === k ? "default" : "outline"}
                className="h-8 text-[11px] capitalize"
                onClick={() => setKind(k)}
              >
                {k}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {results.map((it) => (
            <div
              key={it.id}
              className="group rounded-md border border-border/60 bg-card/40 p-3 hover:border-border hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[12.5px] font-semibold leading-tight">{it.title}</h3>
                  <p className="mt-0.5 text-[10.5px] text-muted-foreground">by {it.author}</p>
                </div>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${KIND_COLORS[it.kind]}`}>
                  {it.kind}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">{it.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Download className="h-3 w-3" /> {fmt(it.downloads)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3" /> {it.stars}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {it.tags.map((t) => (
                  <code key={t} className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0.5 text-[10px]">
                    <Tag className="h-2 w-2" />
                    {t}
                  </code>
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-1.5">
                <Button size="sm" variant="default" className="h-7 gap-1.5 text-[11px]">
                  <Download className="h-3 w-3" /> Install
                </Button>
                <a
                  href={it.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:bg-accent"
                >
                  <ExternalLink className="h-3 w-3" /> View
                </a>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
