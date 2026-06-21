"use client";

/**
 * FeatureHub — mounts all 22 v0.6 feature panels.
 *
 * Each panel is a self-contained Dialog that reads its open-state from
 * the `useFeatureStore` store. Only one panel is ever open at a time.
 *
 * Mount this once in `Notebook.tsx` (or any top-level client component)
 * — it renders nothing visible unless a feature is open.
 */

import { HfModelBrowser } from "./ai-models/HfModelBrowser";
import { HfDatasetBrowser } from "./datasets/HfDatasetBrowser";
import { ExamplesGallery } from "./examples-gallery/ExamplesGallery";
import { TemplateGallery } from "./templates/TemplateGallery";
import { ExtensionManager } from "./extensions/ExtensionManager";
import { VisualizationsPanel } from "./visualizations/VisualizationsPanel";
import { CollaborationPanel } from "./collab/CollaborationPanel";
import { DebuggerPanel } from "./debugger/DebuggerPanel";
import { ProfilerPanel } from "./profiler/ProfilerPanel";
import { GitPanel } from "./git-panel/GitPanel";
import { TerminalEmulator } from "./terminal/TerminalEmulator";
import { FileExplorer } from "./file-explorer/FileExplorer";
import { ScheduledTasks } from "./scheduled-tasks/ScheduledTasks";
import { SecretsManager } from "./secrets-manager/SecretsManager";
import { DataConnectors } from "./data-connectors/DataConnectors";
import { ExperimentTracker } from "./ml-experiments/ExperimentTracker";
import { WorkflowBuilder } from "./workflows/WorkflowBuilder";
import { KernelManager } from "./kernel-manager/KernelManager";
import { CloudDeploy } from "./cloud-deploy/CloudDeploy";
import { LearningHub } from "./learning-hub/LearningHub";
import { Marketplace } from "./marketplace/Marketplace";
import { AboutDialog } from "./help-about/AboutDialog";

export function FeatureHub() {
  return (
    <>
      <HfModelBrowser />
      <HfDatasetBrowser />
      <ExamplesGallery />
      <TemplateGallery />
      <ExtensionManager />
      <VisualizationsPanel />
      <CollaborationPanel />
      <DebuggerPanel />
      <ProfilerPanel />
      <GitPanel />
      <TerminalEmulator />
      <FileExplorer />
      <ScheduledTasks />
      <SecretsManager />
      <DataConnectors />
      <ExperimentTracker />
      <WorkflowBuilder />
      <KernelManager />
      <CloudDeploy />
      <LearningHub />
      <Marketplace />
      <AboutDialog />
    </>
  );
}
