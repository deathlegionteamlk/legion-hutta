"use client";

/**
 * Templates Gallery — start a new notebook from a pre-built template.
 *
 * Templates are static; selecting one initializes the store with the
 * given cells. (For full example notebooks covering HF models, see
 * the Examples Gallery.)
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeatureStore } from "../feature-store";
import { useNotebookStore } from "@/lib/notebook-store";
import { LayoutTemplate, Plus } from "lucide-react";

interface Template {
  id: string;
  title: string;
  description: string;
  icon: string;
  tags: string[];
  cells: Array<{ kind: "code" | "markdown"; source: string }>;
}

const TEMPLATES: Template[] = [
  {
    id: "blank",
    title: "Blank Notebook",
    description: "A single empty code cell. Start from scratch.",
    icon: "File",
    tags: ["minimal"],
    cells: [{ kind: "code", source: "" }],
  },
  {
    id: "data-analysis",
    title: "Data Analysis",
    description: "Pandas + Matplotlib starter with imports and a CSV loader.",
    icon: "Table",
    tags: ["pandas", "matplotlib", "csv"],
    cells: [
      {
        kind: "markdown",
        source: "# Data Analysis\n\nQuick starter: load a CSV, summarize, and plot.",
      },
      {
        kind: "code",
        source:
          'import pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\n\nsns.set_theme(style="whitegrid")\n\ndf = pd.read_csv("data.csv")\nprint(df.shape)\ndf.head()',
      },
      {
        kind: "code",
        source: "df.describe().T",
      },
      {
        kind: "code",
        source: 'df.hist(figsize=(12, 8), bins=30)\nplt.tight_layout()\nplt.show()',
      },
    ],
  },
  {
    id: "ml-train",
    title: "ML Training",
    description: "Scikit-learn train/test split + model fit + metrics.",
    icon: "Brain",
    tags: ["sklearn", "classification"],
    cells: [
      {
        kind: "markdown",
        source: "# ML Training Starter\n\nTrain, evaluate, and inspect a classifier.",
      },
      {
        kind: "code",
        source:
          "from sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.metrics import classification_report, confusion_matrix\n\nX, y = load_iris(return_X_y=True)\nX_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)\nclf = RandomForestClassifier(n_estimators=100, random_state=42).fit(X_tr, y_tr)\ny_pred = clf.predict(X_te)\nprint(classification_report(y_te, y_pred))",
      },
    ],
  },
  {
    id: "deep-learning",
    title: "Deep Learning",
    description: "PyTorch + CUDA setup with a simple MLP.",
    icon: "Cpu",
    tags: ["pytorch", "cuda"],
    cells: [
      {
        kind: "code",
        source:
          'import torch\nimport torch.nn as nn\ndevice = "cuda" if torch.cuda.is_available() else "cpu"\nprint(f"Using device: {device}")\n\nclass MLP(nn.Module):\n    def __init__(self, in_dim=784, hidden=128, out_dim=10):\n        super().__init__()\n        self.net = nn.Sequential(\n            nn.Linear(in_dim, hidden), nn.ReLU(),\n            nn.Linear(hidden, out_dim),\n        )\n    def forward(self, x):\n        return self.net(x.view(x.size(0), -1))\n\nmodel = MLP().to(device)\nprint(model)',
      },
    ],
  },
  {
    id: "ai-magic",
    title: "AI Magic Cell",
    description: "Use the `%%ai` magic to chat with the LLM inline.",
    icon: "Sparkles",
    tags: ["llm", "ai"],
    cells: [
      {
        kind: "markdown",
        source:
          "# AI Magic\n\nCells starting with `%%ai` are sent to the LLM. The response is rendered as markdown.",
      },
      {
        kind: "code",
        source:
          "%%ai\nExplain the difference between supervised and unsupervised learning in 3 sentences.",
      },
    ],
  },
  {
    id: "viz",
    title: "Visualization",
    description: "Plotly + Seaborn interactive chart starter.",
    icon: "BarChart3",
    tags: ["plotly", "seaborn"],
    cells: [
      {
        kind: "code",
        source:
          'import plotly.express as px\nimport seaborn as sns\n\ndf = sns.load_dataset("tips")\nfig = px.scatter(df, x="total_bill", y="tip", color="time", size="size", hover_data=["day"])\nfig.show()',
      },
    ],
  },
  {
    id: "scrape",
    title: "Web Scraping",
    description: "BeautifulSoup + requests starter for HTML parsing.",
    icon: "Globe",
    tags: ["bs4", "requests"],
    cells: [
      {
        kind: "code",
        source:
          'import requests\nfrom bs4 import BeautifulSoup\n\nurl = "https://example.com"\nres = requests.get(url, timeout=10)\nsoup = BeautifulSoup(res.text, "html.parser")\nprint(soup.title.string)\nfor a in soup.find_all("a")[:10]:\n    print(a.get("href"), a.text.strip())',
      },
    ],
  },
  {
    id: "sql",
    title: "SQL Query",
    description: "SQLite in-memory DB with sample data and queries.",
    icon: "Database",
    tags: ["sqlite", "sql"],
    cells: [
      {
        kind: "code",
        source:
          'import sqlite3, pandas as pd\n\nconn = sqlite3.connect(":memory:")\npd.DataFrame({"name": ["Alice", "Bob", "Cara"], "age": [30, 25, 28]}).to_sql("people", conn, index=False)\npd.read_sql("SELECT * FROM people WHERE age > 26 ORDER BY age DESC", conn)',
      },
    ],
  },
];

export function TemplateGallery() {
  const open = useFeatureStore((s) => s.openFeatureId === "templates");
  const close = useFeatureStore((s) => s.closeFeature);
  const insertCells = useNotebookStore((s) => s.insertCells);
  const cells = useNotebookStore((s) => s.cells);

  const apply = (t: Template) => {
    // If the current notebook is empty (one empty code cell), replace.
    if (cells.length <= 1 && (cells[0]?.source ?? "") === "") {
      // Insert after the first cell, then remove the first.
      insertCells(t.cells, cells[0]?.id ?? null);
    } else {
      insertCells(t.cells, null);
    }
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <LayoutTemplate className="h-4 w-4 text-emerald-500" />
            Templates
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Start a new section in your notebook from a pre-built template.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {TEMPLATES.map((t) => (
            <div
              key={t.id}
              className="rounded-md border border-border/70 bg-card/60 p-3 hover:border-border hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-semibold leading-tight">{t.title}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{t.description}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{t.cells.length} cells</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {t.tags.map((tag) => (
                  <code key={tag} className="rounded bg-muted px-1 py-0.5 text-[10px]">{tag}</code>
                ))}
              </div>
              <Button
                size="sm"
                variant="default"
                className="mt-2.5 h-7 gap-1.5 text-[11px]"
                onClick={() => apply(t)}
              >
                <Plus className="h-3 w-3" />
                Insert
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
