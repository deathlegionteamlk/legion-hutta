"use client";

/**
 * Examples Gallery — load one of 16 curated .legion notebooks
 * (Stable Diffusion, FLUX, Llama, Mistral, Whisper, BERT, YOLO, CLIP,
 * SpeechT5, LLaVA, StarCoder, fine-tuning, ControlNet, Bark, RAG, and
 * a cross-model tour).
 *
 * The .legion file is fetched at runtime from the /examples folder and
 * parsed by `parseLegion()` from the format module, then loaded into
 * the notebook store via `applyLegionDocument()`.
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
import { EXAMPLES, type ExampleCategory, type ExampleNotebook } from "@/data/examples-manifest";
import { parseLegion } from "@/lib/legion-format";
import { useNotebookStore } from "@/lib/notebook-store";
import { useFeatureStore } from "../feature-store";
import {
  Search,
  BookOpen,
  Clock,
  Layers,
  Loader2,
  Sparkles,
} from "lucide-react";

const ALL = "__all__" as const;

const CATEGORY_LABELS: Record<ExampleCategory, string> = {
  "image-gen": "Image Generation",
  llm: "LLMs",
  audio: "Audio",
  vision: "Vision",
  embeddings: "Embeddings",
  code: "Code",
  "fine-tuning": "Fine-tuning",
  showcase: "Showcase",
};

const CATEGORY_COLORS: Record<ExampleCategory, string> = {
  "image-gen": "text-pink-600 bg-pink-50 dark:bg-pink-950/30 dark:text-pink-300",
  llm: "text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-300",
  audio: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300",
  vision: "text-sky-600 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-300",
  embeddings: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300",
  code: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-300",
  "fine-tuning": "text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300",
  showcase: "text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/30 dark:text-fuchsia-300",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-emerald-600 border-emerald-200",
  intermediate: "text-amber-600 border-amber-200",
  advanced: "text-rose-600 border-rose-200",
};

export function ExamplesGallery() {
  const open = useFeatureStore((s) => s.openFeatureId === "examples-gallery");
  const close = useFeatureStore((s) => s.closeFeature);
  const applyLegionDocument = useNotebookStore((s) => s.applyLegionDocument);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ExampleCategory | typeof ALL>(ALL);
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const results = useMemo(() => {
    return EXAMPLES.filter((e) => {
      if (cat !== ALL && e.category !== cat) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [query, cat]);

  const load = async (ex: ExampleNotebook) => {
    setLoading(ex.id);
    setErr(null);
    try {
      const res = await fetch(`/examples/${ex.fileName}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const doc = parseLegion(text);
      await applyLegionDocument(doc);
      close();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-fuchsia-500" />
            Example Notebooks
            <Badge variant="secondary" className="ml-1">{EXAMPLES.length}</Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Curated <code className="rounded bg-muted px-1">.legion</code> notebooks for Stable Diffusion, Llama, Whisper &amp; more. Loads straight into your editor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search examples…"
              className="h-8 pl-8 text-[12px]"
            />
          </div>
          <Select value={cat} onValueChange={(v) => setCat(v as ExampleCategory | typeof ALL)}>
            <SelectTrigger className="h-8 w-[180px] text-[12px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {(Object.keys(CATEGORY_LABELS) as ExampleCategory[]).map((c) => (
                <SelectItem key={c} value={c} className="text-[12px]">
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {err && (
          <div className="rounded-md border border-red-300/60 bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {err}
          </div>
        )}

        <div className="flex-1 overflow-auto -mx-1 px-1 pb-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {results.map((ex) => (
              <ExampleCard
                key={ex.id}
                example={ex}
                loading={loading === ex.id}
                onLoad={() => load(ex)}
              />
            ))}
          </div>
          {results.length === 0 && (
            <div className="py-12 text-center text-[12px] text-muted-foreground">
              No examples match.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExampleCard({
  example,
  loading,
  onLoad,
}: {
  example: ExampleNotebook;
  loading: boolean;
  onLoad: () => void;
}) {
  return (
    <div className="group rounded-md border border-border/70 bg-card/60 p-3 hover:border-border hover:bg-accent/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[example.category]}`}>
              {CATEGORY_LABELS[example.category]}
            </span>
            <span className={`rounded border px-1.5 py-0.5 text-[10px] capitalize ${DIFFICULTY_COLORS[example.difficulty]}`}>
              {example.difficulty}
            </span>
          </div>
          <h3 className="mt-1.5 text-[13px] font-semibold leading-tight">{example.title}</h3>
          <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{example.description}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3 w-3" /> {example.cells} cells
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> ~{example.estimatedMinutes} min
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {example.tags.slice(0, 4).map((t) => (
          <code key={t} className="rounded bg-muted px-1 py-0.5 text-[10px]">{t}</code>
        ))}
      </div>

      <div className="mt-2.5">
        <Button
          size="sm"
          variant="default"
          className="h-7 gap-1.5 text-[11px]"
          onClick={onLoad}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {loading ? "Loading…" : "Open notebook"}
        </Button>
      </div>
    </div>
  );
}
