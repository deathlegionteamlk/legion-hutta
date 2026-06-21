"use client";

/**
 * Secrets Manager — store API keys, tokens, and credentials for use
 * inside notebooks. Keys are kept in-memory only (v0.6); encrypted
 * storage is planned for v0.7. Never log or echo the secret value.
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
  KeyRound,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";

interface Secret {
  id: string;
  name: string;
  value: string;
  envVar: string;
  createdAt: number;
}

const INITIAL: Secret[] = [
  {
    id: "s1",
    name: "HuggingFace Token",
    value: "hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    envVar: "HF_TOKEN",
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: "s2",
    name: "OpenAI API Key",
    value: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    envVar: "OPENAI_API_KEY",
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    id: "s3",
    name: "E2B API Key",
    value: "e2b_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    envVar: "E2B_API_KEY",
    createdAt: Date.now() - 1000 * 60 * 30,
  },
];

export function SecretsManager() {
  const open = useFeatureStore((s) => s.openFeatureId === "secrets-manager");
  const close = useFeatureStore((s) => s.closeFeature);
  const [secrets, setSecrets] = useState<Secret[]>(INITIAL);
  const [name, setName] = useState("");
  const [envVar, setEnvVar] = useState("");
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const add = () => {
    if (!name.trim() || !envVar.trim() || !value.trim()) return;
    setSecrets((arr) => [
      ...arr,
      {
        id: `s${arr.length + 1}`,
        name: name.trim(),
        envVar: envVar.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
        value: value.trim(),
        createdAt: Date.now(),
      },
    ]);
    setName("");
    setEnvVar("");
    setValue("");
  };

  const remove = (id: string) => {
    setSecrets((arr) => arr.filter((s) => s.id !== id));
  };

  const toggleVisible = (id: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copy = (s: Secret) => {
    navigator.clipboard?.writeText(s.value);
    setCopied(s.id);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-amber-500" />
            Secrets Manager
            <Badge variant="secondary" className="ml-1">{secrets.length}</Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            API keys, tokens, and credentials. In-memory only in v0.6 — encrypted vault ships in v0.7.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-300/40 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
          Secrets are not committed to git. They are exposed to notebook cells as environment variables only.
        </div>

        <div className="rounded-md border border-border/60 bg-card/40 p-2.5">
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Add secret
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name…" className="h-8 text-[12px]" />
            <Input value={envVar} onChange={(e) => setEnvVar(e.target.value)} placeholder="ENV_VAR_NAME" className="h-8 text-[12px] font-mono" />
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value…" type="password" className="h-8 text-[12px]" />
            <Button size="sm" variant="default" className="h-8 gap-1.5 text-[11px]" onClick={add} disabled={!name.trim() || !envVar.trim() || !value.trim()}>
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-1.5">
          {secrets.map((s) => {
            const isVisible = visible.has(s.id);
            return (
              <div key={s.id} className="rounded-md border border-border/60 bg-card/40 p-2.5">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-semibold">{s.name}</span>
                      <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{s.envVar}</code>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 truncate font-mono text-[11px] text-muted-foreground">
                        {isVisible ? s.value : "•".repeat(Math.min(s.value.length, 36))}
                      </code>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleVisible(s.id)} aria-label="Toggle visibility">
                    {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(s)} aria-label="Copy">
                    {copied === s.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(s.id)} aria-label="Delete">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
          {secrets.length === 0 && (
            <div className="py-12 text-center text-[12px] text-muted-foreground">
              No secrets stored.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
