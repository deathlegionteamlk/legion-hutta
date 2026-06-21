"use client";

/**
 * File Explorer — a tree view of the sandbox filesystem.
 * v0.6 ships a static tree; backend `/api/v1/files` is planned for v0.7.
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
import { useFeatureStore } from "../feature-store";
import { useNotebookStore } from "@/lib/notebook-store";
import {
  FolderTree,
  Folder,
  FolderOpen,
  FileText,
  FileCode2,
  FileJson,
  FileImage,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  RefreshCw,
} from "lucide-react";

interface FsNode {
  name: string;
  type: "file" | "dir";
  size?: string;
  children?: FsNode[];
}

const TREE: FsNode[] = [
  {
    name: "notebook",
    type: "dir",
    children: [
      {
        name: "examples",
        type: "dir",
        children: [
          { name: "stable-diffusion.legion", type: "file", size: "5.4 KB" },
          { name: "llama-chat.legion", type: "file", size: "4.2 KB" },
          { name: "whisper-transcription.legion", type: "file", size: "6.1 KB" },
          { name: "yolo-detection.legion", type: "file", size: "5.8 KB" },
        ],
      },
      {
        name: "data",
        type: "dir",
        children: [
          { name: "input.csv", type: "file", size: "1.2 MB" },
          { name: "labels.json", type: "file", size: "48 KB" },
        ],
      },
      {
        name: "outputs",
        type: "dir",
        children: [
          { name: "plot.png", type: "file", size: "342 KB" },
          { name: "model.pt", type: "file", size: "448 MB" },
        ],
      },
      { name: "main.legion", type: "file", size: "12 KB" },
      { name: "requirements.txt", type: "file", size: "286 B" },
      { name: "README.md", type: "file", size: "1.4 KB" },
    ],
  },
];

function FileIconFor({ name }: { name: string }) {
  if (name.endsWith(".legion") || name.endsWith(".json")) return <FileJson className="h-3.5 w-3.5 text-muted-foreground" />;
  if (name.endsWith(".py") || name.endsWith(".txt") || name.endsWith(".md")) return <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />;
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")) return <FileImage className="h-3.5 w-3.5 text-muted-foreground" />;
  return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
}

function NodeRow({ node, depth }: { node: FsNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  if (node.type === "dir") {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11.5px] hover:bg-accent/60"
          style={{ paddingLeft: depth * 12 + 6 }}
        >
          {open ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          {open ? (
            <FolderOpen className="h-3.5 w-3.5 text-sky-500" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-sky-500" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children && (
          <div>
            {node.children.map((c) => (
              <NodeRow key={c.name} node={c} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[11.5px] hover:bg-accent/60"
      style={{ paddingLeft: depth * 12 + 22 }}
    >
      <FileIconFor name={node.name} />
      <span className="flex-1 truncate">{node.name}</span>
      {node.size && <span className="text-[10px] text-muted-foreground">{node.size}</span>}
    </div>
  );
}

export function FileExplorer() {
  const open = useFeatureStore((s) => s.openFeatureId === "file-explorer");
  const close = useFeatureStore((s) => s.closeFeature);
  const sandbox = useNotebookStore((s) => s.selectedSandbox);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderTree className="h-4 w-4 text-sky-500" />
            File Explorer
            <Badge variant="outline" className="text-[10px]">{sandbox}</Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Browse the sandbox filesystem. Backend `/api/v1/files` lands in v0.7.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
            <Upload className="h-3 w-3" /> Upload
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
            <Download className="h-3 w-3" /> Download
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>

        <div className="flex-1 overflow-auto rounded-md border border-border/60 bg-card/40 py-1">
          {TREE.map((n) => (
            <NodeRow key={n.name} node={n} depth={0} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
