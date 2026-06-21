"use client";

/**
 * SnippetsLibrary — modal dialog with quick-insert code snippets.
 *
 * Clicking a snippet inserts it as a new cell below the active cell
 * (or at the end of the notebook if nothing is active) and closes
 * the dialog.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotebookStore } from "@/lib/notebook-store";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  ChartBar,
  Table,
  Image as ImageIcon,
  FunctionSquare,
  Brain,
  FileText,
  FlaskConical,
} from "lucide-react";
import type { CellKind } from "@/types/notebook";

interface Snippet {
  label: string;
  description: string;
  kind: CellKind;
  source: string;
  icon: React.ComponentType<{ className?: string }>;
  tags: string[];
}

const SNIPPETS: Snippet[] = [
  {
    label: "Imports & setup",
    description: "Common data-science imports (numpy, pandas, matplotlib).",
    kind: "code",
    icon: Sparkles,
    tags: ["setup"],
    source: `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Pretty defaults
sns.set_theme(style="whitegrid", palette="muted")
pd.set_option("display.max_columns", 50)
pd.set_option("display.width", 120)

print("Environment ready — numpy", np.__version__, "pandas", pd.__version__)
`,
  },
  {
    label: "Load CSV",
    description: "Read a CSV file into a DataFrame and show summary stats.",
    kind: "code",
    icon: Table,
    tags: ["data"],
    source: `# Replace with your CSV path
df = pd.read_csv("data.csv")
print(f"Loaded {len(df):,} rows x {df.shape[1]} cols")
df.head()
`,
  },
  {
    label: "Quick histogram",
    description: "Plot a histogram of a numeric column.",
    kind: "code",
    icon: ChartBar,
    tags: ["plot"],
    source: `fig, ax = plt.subplots(figsize=(8, 4))
ax.hist(df["value"], bins=30, color="#6366f1", alpha=0.85)
ax.set_xlabel("value")
ax.set_ylabel("count")
ax.set_title("Distribution of value")
plt.tight_layout()
plt.show()
`,
  },
  {
    label: "Scatter plot",
    description: "Two-column scatter with regression line.",
    kind: "code",
    icon: ChartBar,
    tags: ["plot"],
    source: `fig, ax = plt.subplots(figsize=(6, 5))
ax.scatter(df["x"], df["y"], s=14, alpha=0.6, color="#10b981")
# Best-fit line
m, b = np.polyfit(df["x"], df["y"], 1)
xs = np.linspace(df["x"].min(), df["x"].max(), 100)
ax.plot(xs, m * xs + b, color="#ef4444", linewidth=2, label=f"y = {m:.2f}x + {b:.2f}")
ax.set_xlabel("x")
ax.set_ylabel("y")
ax.legend()
plt.tight_layout()
plt.show()
`,
  },
  {
    label: "Display image",
    description: "Render an image from a local file or URL.",
    kind: "code",
    icon: ImageIcon,
    tags: ["media"],
    source: `from IPython.display import Image, display
display(Image(url="https://placecats.com/neo/600/400"))
`,
  },
  {
    label: "Define a function",
    description: "Template for a typed Python function with docstring.",
    kind: "code",
    icon: FunctionSquare,
    tags: ["python"],
    source: `def greet(name: str, *, excited: bool = False) -> str:
    """Return a friendly greeting.

    Args:
        name: who to greet.
        excited: append an exclamation mark when True.
    """
    msg = f"Hello, {name}!"
    return msg + "!" if excited else msg


print(greet("Legion", excited=True))
`,
  },
  {
    label: "Timing decorator",
    description: "A decorator that prints the wall-clock time of any function.",
    kind: "code",
    icon: FunctionSquare,
    tags: ["python", "perf"],
    source: `import time
from functools import wraps

def timed(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        result = fn(*args, **kwargs)
        dt = (time.perf_counter() - t0) * 1000
        print(f"{fn.__name__} took {dt:.2f} ms")
        return result
    return wrapper


@timed
def slow_sum(n: int) -> int:
    return sum(range(n))

slow_sum(1_000_000)
`,
  },
  {
    label: "Ask the AI",
    description: "Use the %%ai magic to ask the LLM a question.",
    kind: "code",
    icon: Brain,
    tags: ["ai"],
    source: `%%ai
Explain the difference between a list comprehension and a generator expression in Python,
and show me one realistic case where the generator wins.`,
  },
  {
    label: "Markdown section",
    description: "A formatted section divider with bullet checklist.",
    kind: "markdown",
    icon: FileText,
    tags: ["markdown"],
    source: `## Section title

A short paragraph introducing this section.

- [ ] First task
- [ ] Second task
- [x] Done task

> Tip: press **B** to insert a code cell below this one.`,
  },
  {
    label: "Quick experiment scaffold",
    description: "Setup + measure + compare template for benchmarks.",
    kind: "code",
    icon: FlaskConical,
    tags: ["perf", "experiment"],
    source: `import time
import statistics

def benchmark(fn, *, repeats: int = 5) -> dict:
    """Run fn() \`repeats\` times and return summary stats."""
    samples = []
    for _ in range(repeats):
        t0 = time.perf_counter()
        fn()
        samples.append((time.perf_counter() - t0) * 1000)
    return {
        "repeats": repeats,
        "mean_ms": statistics.mean(samples),
        "median_ms": statistics.median(samples),
        "stdev_ms": statistics.stdev(samples) if repeats > 1 else 0.0,
        "min_ms": min(samples),
        "max_ms": max(samples),
    }

# Example usage:
def work():
    return sum(x * x for x in range(10_000))

benchmark(work)
`,
  },
];

const GROUPS: { name: string; tags: string[] }[] = [
  { name: "Setup & data", tags: ["setup", "data"] },
  { name: "Plots & media", tags: ["plot", "media"] },
  { name: "Python patterns", tags: ["python", "perf"] },
  { name: "AI & markdown", tags: ["ai", "markdown", "experiment"] },
];

export function SnippetsLibrary() {
  const open = useNotebookStore((s) => s.snippetsOpen);
  const toggle = useNotebookStore((s) => s.toggleSnippets);
  const insert = useNotebookStore((s) => s.insertSnippet);
  const activeCellId = useNotebookStore((s) => s.activeCellId);

  return (
    <Dialog open={open} onOpenChange={(v) => toggle(v)}>
      <DialogContent className="max-h-[80vh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border/60 px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Snippets library
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Click any snippet to insert it as a new cell below the active cell.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[68vh] px-5 py-4">
          <div className="flex flex-col gap-6">
            {GROUPS.map((group) => {
              const items = SNIPPETS.filter((s) =>
                s.tags.some((t) => group.tags.includes(t)),
              );
              if (items.length === 0) return null;
              return (
                <section key={group.name}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.name}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    {items.map((snip) => {
                      const Icon = snip.icon;
                      return (
                        <button
                          key={snip.label}
                          type="button"
                          onClick={() => insert(snip, activeCellId)}
                          className={cn(
                            "group flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3 text-left",
                            "transition-colors hover:border-violet-400/60 hover:bg-violet-50/40",
                            "dark:hover:bg-violet-950/20",
                          )}
                        >
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[12.5px] font-medium">
                                {snip.label}
                              </span>
                              <Badge
                                variant="outline"
                                className="h-4 px-1.5 text-[9.5px] font-normal uppercase tracking-wider text-muted-foreground"
                              >
                                {snip.kind}
                              </Badge>
                            </div>
                            <p className="text-[11.5px] text-muted-foreground">
                              {snip.description}
                            </p>
                            <pre className="mt-1 max-h-20 overflow-hidden rounded bg-muted/40 px-2 py-1 font-mono text-[10.5px] leading-tight text-muted-foreground/90">
                              {snip.source.split("\n").slice(0, 3).join("\n")}
                              {snip.source.split("\n").length > 3 ? "\n…" : ""}
                            </pre>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
