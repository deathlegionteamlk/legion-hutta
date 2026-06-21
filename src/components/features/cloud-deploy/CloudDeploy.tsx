"use client";

/**
 * Cloud Deploy — deploy the notebook as an interactive app or API.
 * Targets: HuggingFace Spaces, Modal, Replicate, Streamlit Cloud,
 * Railway, Fly.io. v0.6 ships the UI shell; backend deploy hooks land
 * in v0.7.
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
  Cloud,
  Rocket,
  Check,
  ExternalLink,
  Loader2,
  Globe,
  Server,
  Cpu,
} from "lucide-react";

interface Target {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tier: "free" | "paid";
  supports: string[];
  docsUrl: string;
}

const TARGETS: Target[] = [
  {
    id: "hf-spaces",
    name: "HuggingFace Spaces",
    description: "Free CPU tier, paid GPU. Streamlit / Gradio / static.",
    icon: Globe,
    color: "text-amber-500",
    tier: "free",
    supports: ["Streamlit", "Gradio", "Docker", "Static"],
    docsUrl: "https://huggingface.co/spaces",
  },
  {
    id: "modal",
    name: "Modal",
    description: "Serverless Python with GPU. Pay per second.",
    icon: Cpu,
    color: "text-violet-500",
    tier: "paid",
    supports: ["Functions", "Web Endpoints", "Scheduled Jobs"],
    docsUrl: "https://modal.com",
  },
  {
    id: "replicate",
    name: "Replicate",
    description: "Deploy models as HTTP APIs. Per-call pricing.",
    icon: Server,
    color: "text-sky-500",
    tier: "paid",
    supports: ["Model API", "Predictions"],
    docsUrl: "https://replicate.com",
  },
  {
    id: "streamlit-cloud",
    name: "Streamlit Cloud",
    description: "Free hosting for Streamlit apps. Connects to GitHub.",
    icon: Globe,
    color: "text-rose-500",
    tier: "free",
    supports: ["Streamlit"],
    docsUrl: "https://streamlit.io/cloud",
  },
  {
    id: "railway",
    name: "Railway",
    description: "Deploy from GitHub. Supports any framework.",
    icon: Server,
    color: "text-purple-500",
    tier: "paid",
    supports: ["Docker", "Node", "Python"],
    docsUrl: "https://railway.app",
  },
  {
    id: "fly-io",
    name: "Fly.io",
    description: "Global edge deploys. Docker-based.",
    icon: Cloud,
    color: "text-indigo-500",
    tier: "paid",
    supports: ["Docker", "Volumes", "Postgres"],
    docsUrl: "https://fly.io",
  },
];

type DeployState = "idle" | "deploying" | "deployed";

export function CloudDeploy() {
  const open = useFeatureStore((s) => s.openFeatureId === "cloud-deploy");
  const close = useFeatureStore((s) => s.closeFeature);
  const [selId, setSelId] = useState<string | null>("hf-spaces");
  const [appName, setAppName] = useState("my-legion-app");
  const [state, setState] = useState<DeployState>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const sel = TARGETS.find((t) => t.id === selId);

  const deploy = () => {
    if (!sel || !appName.trim()) return;
    setState("deploying");
    setUrl(null);
    setTimeout(() => {
      setState("deployed");
      setUrl(`https://${appName.trim().toLowerCase()}-${sel.id}.example.com`);
    }, 1800);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Cloud className="h-4 w-4 text-sky-500" />
            Cloud Deploy
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Deploy your notebook as an app or API. Backend integration lands in v0.7.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-auto">
          {/* Targets */}
          <div className="space-y-1.5">
            {TARGETS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelId(t.id);
                  setState("idle");
                  setUrl(null);
                }}
                className={`flex w-full items-start gap-2 rounded-md border p-2.5 text-left transition-colors ${
                  selId === t.id
                    ? "border-foreground/40 bg-accent/50"
                    : "border-border/60 bg-card/40 hover:bg-accent/30"
                }`}
              >
                <t.icon className={`mt-0.5 h-4 w-4 ${t.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold">{t.name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {t.tier}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t.description}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.supports.map((s) => (
                      <code key={s} className="rounded bg-muted px-1 py-0.5 text-[10px]">{s}</code>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Deploy form */}
          <div className="rounded-md border border-border/60 bg-card/40 p-3">
            {!sel && (
              <div className="py-12 text-center text-[12px] text-muted-foreground">
                Select a target.
              </div>
            )}
            {sel && (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <sel.icon className={`h-4 w-4 ${sel.color}`} />
                  <h3 className="text-[13px] font-semibold">{sel.name}</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="mb-0.5 block text-[10.5px] text-muted-foreground">App name</label>
                    <Input
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      className="h-8 text-[12px] font-mono"
                    />
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/60 p-2">
                    <div className="text-[10.5px] text-muted-foreground">Detected framework</div>
                    <div className="text-[12px] font-mono">gradio.App()</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="mt-3 h-8 gap-1.5 text-[11px]"
                  onClick={deploy}
                  disabled={state === "deploying" || !appName.trim()}
                >
                  {state === "deploying" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Deploying…
                    </>
                  ) : state === "deployed" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" /> Deployed
                    </>
                  ) : (
                    <>
                      <Rocket className="h-3 w-3" /> Deploy
                    </>
                  )}
                </Button>

                {url && (
                  <div className="mt-3 rounded-md border border-emerald-300/50 bg-emerald-50/60 p-2 dark:bg-emerald-950/30">
                    <div className="text-[10.5px] text-emerald-800 dark:text-emerald-300">Live URL</div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[12px] text-emerald-700 dark:text-emerald-400 underline"
                    >
                      {url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                <a
                  href={sel.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" /> Read {sel.name} docs
                </a>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
