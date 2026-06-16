"use client";

/**
 * AiAssistant — side panel for chatting with the LLM.
 *
 * Features:
 *  - Streaming chat with the LLM (z-ai-web-dev-sdk on the server)
 *  - Context-aware: the store sends the recent cells + variables
 *  - Quick actions: Explain current cell, Fix current cell, Generate cells
 *  - Stop / clear conversation
 *
 * Opens with Ctrl+/ (handled by the Notebook keyboard handler).
 */

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  Trash2,
  X,
  Sparkles,
  Wand2,
  Bug,
  BookOpen,
  Loader2,
} from "lucide-react";
import { useNotebookStore } from "@/lib/notebook-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MarkdownView } from "./MarkdownView";

export function AiAssistant() {
  const open = useNotebookStore((s) => s.aiPanelOpen);
  const toggle = useNotebookStore((s) => s.toggleAiPanel);
  const messages = useNotebookStore((s) => s.aiMessages);
  const send = useNotebookStore((s) => s.sendAiMessage);
  const clear = useNotebookStore((s) => s.clearAiMessages);
  const isStreaming = useNotebookStore((s) => s.aiIsStreaming);
  const explainCell = useNotebookStore((s) => s.explainCell);
  const fixCell = useNotebookStore((s) => s.fixCell);
  const generateCells = useNotebookStore((s) => s.generateCells);
  const activeCellId = useNotebookStore((s) => s.activeCellId);
  const cells = useNotebookStore((s) => s.cells);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;
    void send(input);
    setInput("");
  };

  if (!open) return null;

  const activeCell = cells.find((c) => c.id === activeCellId);

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-screen w-full max-w-md flex-col border-l border-border/60 bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold">AI Assistant</span>
          <span className="text-[10px] text-muted-foreground">
            Context-aware · streaming
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={clear}
            title="Clear conversation"
            disabled={messages.length === 0 || isStreaming}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => toggle(false)}
            title="Close (Ctrl+/)"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-1.5 border-b border-border/60 px-3 py-2">
        <QuickAction
          icon={<BookOpen className="h-3 w-3" />}
          label="Explain cell"
          onClick={() => activeCellId && explainCell(activeCellId)}
          disabled={!activeCell || activeCell.kind !== "code" || isStreaming}
        />
        <QuickAction
          icon={<Bug className="h-3 w-3" />}
          label="Fix error"
          onClick={() => activeCellId && fixCell(activeCellId)}
          disabled={!activeCell?.hasError || isStreaming}
        />
        <QuickAction
          icon={<Wand2 className="h-3 w-3" />}
          label="Generate cells"
          onClick={() => {
            const p = prompt("Describe what you want to generate:");
            if (p) void generateCells(p, activeCellId);
          }}
          disabled={isStreaming}
        />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef as never}>
        <div className="flex flex-col gap-3 p-4">
          {messages.length === 0 && (
            <EmptyState />
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border/60 p-3"
      >
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your notebook…  (Enter to send, Shift+Enter for newline)"
            rows={3}
            disabled={isStreaming}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="resize-none pr-10 text-[13px]"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute bottom-2 right-2 h-7 w-7"
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          The assistant sees your kernel state and recent cells.
        </p>
      </form>
    </aside>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium",
        "hover:bg-accent hover:text-accent-foreground transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MessageBubble({
  message,
}: {
  message: { id: string; role: "user" | "assistant" | "system"; content: string; streaming?: boolean; error?: boolean };
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "max-w-[90%] rounded-lg px-3 py-2 text-[13px]",
          isUser
            ? "bg-primary text-primary-foreground"
            : message.error
              ? "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200"
              : "bg-muted",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <MarkdownView source={message.content || (message.streaming ? "…" : "")} />
          </div>
        )}
      </div>
      {message.streaming && (
        <span className="ml-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Sparkles className="h-2.5 w-2.5 animate-pulse" />
          thinking…
        </span>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20">
        <Bot className="h-6 w-6 text-violet-600 dark:text-violet-400" />
      </div>
      <div>
        <p className="text-[13px] font-medium">Chat with your notebook</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Ask questions, explain code, fix errors, or generate new cells.
        </p>
      </div>
      <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
        <span>• &quot;Explain what this notebook does&quot;</span>
        <span>• &quot;Plot a sine wave using matplotlib&quot;</span>
        <span>• &quot;Why did my last cell fail?&quot;</span>
      </div>
    </div>
  );
}
