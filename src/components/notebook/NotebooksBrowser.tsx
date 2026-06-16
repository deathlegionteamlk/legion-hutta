"use client";

/**
 * NotebooksBrowser — modal dialog for opening saved notebooks.
 *
 * Lists notebooks from the database, sorted by last-updated. Each
 * row shows title, sandbox, kernel spec, and timestamps. Click to
 * open; trash icon to delete.
 */

import { useEffect } from "react";
import { FolderOpen, Trash2, FileText, Clock, Plus } from "lucide-react";
import { useNotebookStore } from "@/lib/notebook-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export function NotebooksBrowser() {
  const open = useNotebookStore((s) => s.notebooksPanelOpen);
  const toggle = useNotebookStore((s) => s.toggleNotebooksPanel);
  const list = useNotebookStore((s) => s.notebooksList);
  const refresh = useNotebookStore((s) => s.refreshNotebooksList);
  const openNotebook = useNotebookStore((s) => s.openNotebook);
  const newNotebook = useNotebookStore((s) => s.newNotebook);
  const currentNotebookId = useNotebookStore((s) => s.currentNotebookId);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  return (
    <Dialog open={open} onOpenChange={toggle}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Open notebook
          </DialogTitle>
          <DialogDescription>
            Pick a saved notebook to load. The current notebook will be replaced.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[12px]"
            onClick={() => {
              void newNotebook();
              toggle(false);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            New notebook
          </Button>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {list.length} saved {list.length === 1 ? "notebook" : "notebooks"}
          </span>
        </div>

        <ScrollArea className="max-h-[60vh]">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-[13px] font-medium">No saved notebooks yet</p>
              <p className="text-[11px] text-muted-foreground">
                Use the Save button in the toolbar to save the current notebook.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {list.map((nb) => (
                <div
                  key={nb.id}
                  className={
                    "group flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 hover:bg-accent/50" +
                    (nb.id === currentNotebookId ? " border-primary/40 bg-primary/5" : "")
                  }
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <button
                    className="flex flex-1 flex-col items-start gap-1 text-left"
                    onClick={() => {
                      void openNotebook(nb.id);
                    }}
                  >
                    <span className="text-[13px] font-medium">{nb.title}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {nb.kernelSpec && (
                        <Badge variant="secondary" className="text-[10px] py-0 h-4">
                          {nb.kernelSpec}
                        </Badge>
                      )}
                      {nb.sandbox && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4">
                          {nb.sandbox}
                        </Badge>
                      )}
                      <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(nb.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${nb.title}"?`)) {
                        await fetch(`/api/notebooks/${nb.id}`, { method: "DELETE" });
                        void refresh();
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
