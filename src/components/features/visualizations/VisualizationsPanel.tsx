"use client";

/**
 * Visualizations Panel — describes how Legion Hutta renders rich
 * MIME outputs in cells. Includes a preview gallery of supported
 * MIME types with example payload shapes.
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
import { LineChart, Image, Code, FileJson, Table2, Sigma } from "lucide-react";

interface VizType {
  mime: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  example: string;
}

const VIZ_TYPES: VizType[] = [
  {
    mime: "image/png",
    label: "PNG Image",
    description: "Base64-encoded raster image. Matplotlib's plt.show() output.",
    icon: Image,
    color: "text-pink-500",
    example: `from IPython.display import Image\nImage(url="https://example.com/cat.png")`,
  },
  {
    mime: "image/svg+xml",
    label: "SVG",
    description: "Vector graphics. Used by Plotly, Graphviz, and SVG matplotlib backend.",
    icon: Image,
    color: "text-pink-500",
    example: `import matplotlib.pyplot as plt\nplt.plot([1,2,3])\nplt.show()  # if backend = SVG`,
  },
  {
    mime: "text/html",
    label: "HTML",
    description: "Arbitrary HTML. Pandas DataFrames render as styled tables.",
    icon: Code,
    color: "text-orange-500",
    example: `import pandas as pd\npd.DataFrame({"a":[1,2],"b":[3,4]}).to_html()`,
  },
  {
    mime: "application/json",
    label: "JSON",
    description: "Pretty-printed JSON with syntax highlighting.",
    icon: FileJson,
    color: "text-amber-500",
    example: `{"key": "value", "nested": {"arr": [1, 2, 3]}}`,
  },
  {
    mime: "text/markdown",
    label: "Markdown",
    description: "GitHub-flavored markdown rendered with full GFM (tables, code, lists).",
    icon: Sigma,
    color: "text-violet-500",
    example: `# Heading\n\n- bullet\n- bullet\n\n\`\`\`python\nprint("hi")\n\`\`\``,
  },
  {
    mime: "text/latex",
    label: "LaTeX",
    description: "Math rendered via KaTeX — `$E=mc^2$` style.",
    icon: Sigma,
    color: "text-emerald-500",
    example: `$\\\\int_0^\\\\infty e^{-x^2} dx = \\\\frac{\\\\sqrt{\\\\pi}}{2}$`,
  },
  {
    mime: "application/vnd.plotly.v1+json",
    label: "Plotly",
    description: "Interactive Plotly figure (via the plotly extension).",
    icon: LineChart,
    color: "text-sky-500",
    example: `import plotly.express as px\npx.scatter(x=[1,2,3], y=[4,5,6]).show()`,
  },
  {
    mime: "application/vnd.vega.v5+json",
    label: "Vega-Lite",
    description: "Declarative Vega-Lite spec rendered inline.",
    icon: LineChart,
    color: "text-sky-500",
    example: `{"$schema":"https://vega.github.io/schema/vega-lite/v5.json","mark":"bar","data":{"values":[{"a":"A","b":28}]}}`,
  },
  {
    mime: "application/vnd.dataframe+json",
    label: "DataFrame",
    description: "Pandas-style table with sortable headers.",
    icon: Table2,
    color: "text-indigo-500",
    example: `import pandas as pd\npd.DataFrame({"x":[1,2,3],"y":[4,5,6]})`,
  },
];

export function VisualizationsPanel() {
  const open = useFeatureStore((s) => s.openFeatureId === "visualizations");
  const close = useFeatureStore((s) => s.closeFeature);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <LineChart className="h-4 w-4 text-sky-500" />
            Visualizations
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Legion Hutta renders {VIZ_TYPES.length} MIME types in cell outputs.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {VIZ_TYPES.map((v) => (
            <div key={v.mime} className="rounded-md border border-border/60 bg-card/40 p-3">
              <div className="flex items-start gap-2">
                <v.icon className={`mt-0.5 h-4 w-4 ${v.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold">{v.label}</span>
                  </div>
                  <code className="block mt-0.5 text-[10px] text-muted-foreground">{v.mime}</code>
                  <p className="mt-1 text-[11px] text-muted-foreground">{v.description}</p>
                  <pre className="mt-2 overflow-x-auto rounded bg-muted/70 p-2 text-[10.5px]">
                    <code>{v.example}</code>
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline">{VIZ_TYPES.length} MIME types</Badge>
          <span>·</span>
          <span>Outputs auto-detect the best renderer based on the MIME type.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
