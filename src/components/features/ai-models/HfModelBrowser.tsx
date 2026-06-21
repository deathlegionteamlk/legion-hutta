"use client";

/**
 * HuggingFace Model Browser.
 *
 * Catalog of 377+ models across 27 categories (text-gen, image-gen,
 * speech, vision-language, code, embeddings, etc.). Each card shows
 * downloads, likes, license, and a "Insert install snippet" button
 * that drops the model's `installSnippet` into the active notebook.
 */

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HF_CATEGORIES,
  HF_MODELS,
  searchHfModels,
  getCategoryStats,
  type HfModel,
  type HfModelCategory,
} from "@/data/hf-models";
import { useFeatureStore } from "../feature-store";
import { useNotebookStore } from "@/lib/notebook-store";
import {
  Search,
  Download,
  Star,
  Tag,
  Code2,
  TrendingUp,
  Boxes,
  ExternalLink,
} from "lucide-react";

const ALL = "__all__" as const;

export function HfModelBrowser() {
  const open = useFeatureStore((s) => s.openFeatureId === "ai-models");
  const close = useFeatureStore((s) => s.closeFeature);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<HfModelCategory | typeof ALL>(ALL);
  const [trending, setTrending] = useState(false);
  const insertCells = useNotebookStore((s) => s.insertCells);
  const activeCellId = useNotebookStore((s) => s.activeCellId);

  const stats = useMemo(() => getCategoryStats(), []);

  const results = useMemo(() => {
    if (trending) {
      const list = [...HF_MODELS].sort((a, b) => b.downloads - a.downloads).slice(0, 30);
      return list;
    }
    if (query.trim()) {
      return searchHfModels(query, cat === ALL ? undefined : cat);
    }
    if (cat !== ALL) {
      return [...HF_MODELS]
        .filter((m) => m.category === cat)
        .sort((a, b) => b.downloads - a.downloads);
    }
    return [...HF_MODELS].sort((a, b) => b.downloads - a.downloads).slice(0, 60);
  }, [query, cat, trending]);

  const insert = (m: HfModel) => {
    const cells: Array<{ kind: "code" | "markdown"; source: string }> = [
      {
        kind: "markdown",
        source: `## ${m.name}\n\n${m.description}\n\n- **Author:** \`${m.author}\`\n- **License:** ${m.license ?? "—"}\n- **HF:** [${m.id}](https://huggingface.co/${m.id})\n`,
      },
      { kind: "code", source: m.installSnippet },
    ];
    if (m.exampleSnippet) {
      cells.push({ kind: "code", source: m.exampleSnippet });
    }
    insertCells(cells, activeCellId);
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Boxes className="h-4 w-4 text-violet-500" />
            HuggingFace Models
            <Badge variant="secondary" className="ml-1">{HF_MODELS.length} models</Badge>
            <Badge variant="outline" className="text-[10px]">{HF_CATEGORIES.length} categories</Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Browse the catalog and insert install + example snippets into your notebook with one click.
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models by name, author, task, or tag…"
              className="h-8 pl-8 text-[12px]"
            />
          </div>
          <Select value={cat} onValueChange={(v) => setCat(v as HfModelCategory | typeof ALL)}>
            <SelectTrigger className="h-8 w-[220px] text-[12px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {HF_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-[12px]">
                  {c.label} ({stats.find((s) => s.category.id === c.id)?.count ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={trending ? "default" : "outline"}
            className="h-8 gap-1.5"
            onClick={() => {
              setTrending((v) => !v);
              setQuery("");
              setCat(ALL);
            }}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Trending
          </Button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto -mx-1 px-1 pb-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {results.map((m) => (
              <ModelCard key={m.id} model={m} onInsert={() => insert(m)} />
            ))}
          </div>
          {results.length === 0 && (
            <div className="py-12 text-center text-[12px] text-muted-foreground">
              No models match your search.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModelCard({ model, onInsert }: { model: HfModel; onInsert: () => void }) {
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1)}K`
        : `${n}`;
  return (
    <div className="group rounded-md border border-border/70 bg-card/60 p-3 hover:border-border hover:bg-accent/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[12.5px] font-semibold truncate">{model.name}</span>
            <span className="text-[10px] text-muted-foreground truncate">{model.author}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
            {model.description}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
          {model.category.replace(/-/g, " ")}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Download className="h-3 w-3" /> {fmt(model.downloads)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Star className="h-3 w-3" /> {model.likes}
        </span>
        {model.license && (
          <span className="inline-flex items-center gap-1">
            <Tag className="h-3 w-3" /> {model.license}
          </span>
        )}
        {model.tags.slice(0, 2).map((t) => (
          <span key={t} className="rounded bg-muted px-1 py-0.5">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <Button
          size="sm"
          variant="default"
          className="h-7 gap-1.5 text-[11px]"
          onClick={onInsert}
        >
          <Code2 className="h-3 w-3" />
          Insert snippet
        </Button>
        <a
          href={`https://huggingface.co/${model.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:bg-accent"
        >
          <ExternalLink className="h-3 w-3" />
          View
        </a>
      </div>
    </div>
  );
}
