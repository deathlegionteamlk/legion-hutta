/**
 * Feature store — a tiny zustand store that tracks which top-level
 * "feature panel" (out of the 22 shipped in v0.6) is currently open.
 *
 * We use a separate store rather than extending the main notebook store
 * so the 22 features don't pollute the core notebook state — most users
 * will only ever open one of these at a time, and they're all dialogs.
 *
 * Each feature is identified by a stable string ID. The `<FeatureHub />`
 * component renders every feature's dialog, but only the active one is
 * open at any time. `openFeature(null)` closes everything.
 */

import { create } from "zustand";

export type FeatureId =
  | "ai-models"
  | "datasets"
  | "examples-gallery"
  | "templates"
  | "extensions"
  | "visualizations"
  | "collab"
  | "debugger"
  | "profiler"
  | "git-panel"
  | "terminal"
  | "file-explorer"
  | "scheduled-tasks"
  | "secrets-manager"
  | "data-connectors"
  | "ml-experiments"
  | "workflows"
  | "kernel-manager"
  | "cloud-deploy"
  | "learning-hub"
  | "marketplace"
  | "help-about";

interface FeatureStore {
  openFeatureId: FeatureId | null;
  openFeature: (id: FeatureId) => void;
  closeFeature: () => void;
  toggleFeature: (id: FeatureId) => void;
}

export const useFeatureStore = create<FeatureStore>((set, get) => ({
  openFeatureId: null,
  openFeature: (id) => set({ openFeatureId: id }),
  closeFeature: () => set({ openFeatureId: null }),
  toggleFeature: (id) =>
    set({
      openFeatureId: get().openFeatureId === id ? null : id,
    }),
}));

/**
 * The registry of all 22 features — used by the Toolbar's "Features"
 * dropdown and by the CommandPalette to build their menu items.
 */
export interface FeatureMeta {
  id: FeatureId;
  label: string;
  description: string;
  icon: string; // lucide icon name
  category: "ai" | "data" | "devtools" | "deploy" | "discover";
  shortcut?: string;
  badge?: string;
}

export const FEATURE_REGISTRY: FeatureMeta[] = [
  // --- AI ---
  {
    id: "ai-models",
    label: "HuggingFace Models",
    description: "Browse 377+ models across 27 categories",
    icon: "Boxes",
    category: "ai",
    badge: "377+",
  },
  {
    id: "datasets",
    label: "HuggingFace Datasets",
    description: "Browse 138 datasets across 11 categories",
    icon: "Database",
    category: "ai",
    badge: "138",
  },
  {
    id: "examples-gallery",
    label: "Example Notebooks",
    description: "Curated .legion notebooks for Stable Diffusion, Llama, Whisper & more",
    icon: "BookOpen",
    category: "ai",
    badge: "16",
  },
  // --- Discover ---
  {
    id: "templates",
    label: "Templates",
    description: "Start from a blank or pre-built template",
    icon: "LayoutTemplate",
    category: "discover",
  },
  {
    id: "extensions",
    label: "Extensions",
    description: "Manage installed extensions & plugins",
    icon: "Puzzle",
    category: "discover",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    description: "Browse community notebooks & extensions",
    icon: "Store",
    category: "discover",
  },
  {
    id: "learning-hub",
    label: "Learning Hub",
    description: "Docs, tutorials, and quickstarts",
    icon: "GraduationCap",
    category: "discover",
  },
  {
    id: "help-about",
    label: "About Legion Hutta",
    description: "Version info, credits, licenses",
    icon: "Info",
    category: "discover",
  },
  // --- Data ---
  {
    id: "data-connectors",
    label: "Data Connectors",
    description: "Connect to PostgreSQL, MySQL, S3, BigQuery & more",
    icon: "Plug",
    category: "data",
  },
  {
    id: "file-explorer",
    label: "File Explorer",
    description: "Browse the sandbox filesystem",
    icon: "FolderTree",
    category: "data",
  },
  {
    id: "secrets-manager",
    label: "Secrets Manager",
    description: "Store API keys, tokens, and credentials",
    icon: "KeyRound",
    category: "data",
  },
  // --- DevTools ---
  {
    id: "debugger",
    label: "Debugger",
    description: "Step through Python code line by line",
    icon: "Bug",
    category: "devtools",
  },
  {
    id: "profiler",
    label: "Profiler",
    description: "Line-by-line timing analysis",
    icon: "Gauge",
    category: "devtools",
  },
  {
    id: "terminal",
    label: "Terminal",
    description: "Embedded shell in the sandbox",
    icon: "Terminal",
    category: "devtools",
  },
  {
    id: "git-panel",
    label: "Git Panel",
    description: "Commit, branch, diff, and push",
    icon: "GitBranch",
    category: "devtools",
  },
  {
    id: "kernel-manager",
    label: "Kernel Manager",
    description: "Manage multiple kernels & languages",
    icon: "Cpu",
    category: "devtools",
  },
  {
    id: "visualizations",
    label: "Visualizations",
    description: "Render Plotly, Altair, Bokeh outputs",
    icon: "LineChart",
    category: "devtools",
  },
  {
    id: "workflows",
    label: "Workflow Builder",
    description: "Build DAG pipelines across cells",
    icon: "Workflow",
    category: "devtools",
  },
  {
    id: "scheduled-tasks",
    label: "Scheduled Tasks",
    description: "Run notebooks on a cron schedule",
    icon: "CalendarClock",
    category: "devtools",
  },
  // --- Deploy ---
  {
    id: "ml-experiments",
    label: "ML Experiments",
    description: "Track runs, metrics, and hyperparameters",
    icon: "FlaskConical",
    category: "deploy",
  },
  {
    id: "cloud-deploy",
    label: "Cloud Deploy",
    description: "Deploy to HF Spaces, Modal, Replicate",
    icon: "Cloud",
    category: "deploy",
  },
  {
    id: "collab",
    label: "Collaboration",
    description: "Real-time presence & comments",
    icon: "Users",
    category: "deploy",
  },
];
