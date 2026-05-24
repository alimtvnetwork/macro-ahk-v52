/**
 * Extracted from ProjectDetailView.tsx (PERF-R1) — Injection Order Preview.
 *
 * Computes and renders the deterministic Global → Dependencies → Project
 * script execution order for a single StoredProject.
 */
import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ListOrdered,
  ArrowDown,
  Globe,
  Link,
  FileCode,
} from "lucide-react";
import type { StoredProject } from "@/hooks/use-projects-scripts";

export interface InjectionOrderPreviewProps {
  project: StoredProject;
  allProjects: StoredProject[];
  globalProjects: StoredProject[];
  deps: Array<{ projectId: string; version: string }>;
  isGlobal: boolean;
}

interface OrderEntry {
  step: number;
  label: string;
  scriptName: string;
  stage: "global" | "dependency" | "project";
  projectName: string;
  isEnabled: boolean;
  order: number;
}

// eslint-disable-next-line max-lines-per-function
export function InjectionOrderPreview({ project, allProjects, globalProjects, deps, isGlobal }: InjectionOrderPreviewProps) {
  const [expanded, setExpanded] = useState(true);

  // eslint-disable-next-line max-lines-per-function
  const entries = useMemo(() => {
    const result: OrderEntry[] = [];
    let step = 1;

    if (!isGlobal) {
      for (const gp of globalProjects) {
        const scripts = gp.scripts ?? [];
        if (scripts.length === 0) {
          result.push({ step: step++, label: "SDK Init", scriptName: gp.name, stage: "global", projectName: gp.name, isEnabled: true, order: -1000 });
        } else {
          for (const s of scripts) {
            result.push({ step: step++, label: s.path.split("/").pop() ?? s.path, scriptName: s.path, stage: "global", projectName: gp.name, isEnabled: true, order: s.order });
          }
        }
      }
    }

    const visited = new Set<string>();
    const collectDeps = (depList: Array<{ projectId: string; version: string }>) => {
      for (const dep of depList) {
        if (visited.has(dep.projectId)) continue;
        visited.add(dep.projectId);
        const depProject = allProjects.find((p) => p.id === dep.projectId);
        if (!depProject) continue;
        if (depProject.isGlobal) continue;
        if (depProject.dependencies?.length) {
          collectDeps(depProject.dependencies);
        }
        const scripts = depProject.scripts ?? [];
        if (scripts.length === 0) {
          result.push({ step: step++, label: depProject.name, scriptName: depProject.name, stage: "dependency", projectName: depProject.name, isEnabled: true, order: -500 });
        } else {
          for (const s of scripts) {
            result.push({ step: step++, label: s.path.split("/").pop() ?? s.path, scriptName: s.path, stage: "dependency", projectName: depProject.name, isEnabled: true, order: s.order });
          }
        }
      }
    };
    collectDeps(deps);

    for (const s of project.scripts ?? []) {
      result.push({ step: step++, label: s.path.split("/").pop() ?? s.path, scriptName: s.path, stage: "project", projectName: project.name, isEnabled: true, order: s.order });
    }

    return result;
  }, [project, allProjects, globalProjects, deps, isGlobal]);

  if (entries.length === 0) {
    return (
      <div className="rounded-md bg-muted/30 p-2.5">
        <p className="text-[10px] text-muted-foreground">
          <strong>Injection order:</strong> No scripts configured.
        </p>
      </div>
    );
  }

  const stageColor = (stage: OrderEntry["stage"]) => {
    switch (stage) {
      case "global": return "bg-primary/10 text-primary border-primary/30";
      case "dependency": return "bg-accent/50 text-accent-foreground border-accent/30";
      case "project": return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/30";
    }
  };

  const stageLabel = (stage: OrderEntry["stage"]) => {
    switch (stage) {
      case "global": return "Global";
      case "dependency": return "Dep";
      case "project": return "Main";
    }
  };

  const stageIcon = (stage: OrderEntry["stage"]) => {
    switch (stage) {
      case "global": return Globe;
      case "dependency": return Link;
      case "project": return FileCode;
    }
  };

  return (
    <div className="rounded-md border border-border bg-muted/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <ListOrdered className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-bold text-foreground">Injection Order Preview</span>
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">{entries.length} script{entries.length !== 1 ? "s" : ""}</span>
      </button>

      {expanded && (
        <div className="border-t border-border">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/20 border-b border-border">
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Stages:</span>
            {(["global", "dependency", "project"] as const).map((stage) => {
              const count = entries.filter((e) => e.stage === stage).length;
              if (count === 0) return null;
              const Icon = stageIcon(stage);
              return (
                <span key={stage} className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${stageColor(stage)}`}>
                  <Icon className="h-2.5 w-2.5" />
                  {stageLabel(stage)} ({count})
                </span>
              );
            })}
          </div>

          <div className="divide-y divide-border/50">
            {entries.map((entry, i) => {
              const Icon = stageIcon(entry.stage);
              const showStageDivider = i > 0 && entries[i - 1].stage !== entry.stage;

              return (
                <div key={`${entry.stage}-${entry.scriptName}-${i}`}>
                  {showStageDivider && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-muted/30">
                      <ArrowDown className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                        {entry.stage === "dependency" ? "Dependencies" : entry.stage === "project" ? "Project Scripts" : "Global"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/20 transition-colors">
                    <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">
                      {entry.step}.
                    </span>

                    <div className="relative flex items-center justify-center w-4 shrink-0">
                      <div className={`h-2.5 w-2.5 rounded-full border-2 ${
                        entry.stage === "global"
                          ? "border-primary bg-primary/20"
                          : entry.stage === "dependency"
                            ? "border-accent-foreground/50 bg-accent/30"
                            : "border-[hsl(var(--success))] bg-[hsl(var(--success))]/20"
                      }`} />
                      {i < entries.length - 1 && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-3 bg-border" />
                      )}
                    </div>

                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${stageColor(entry.stage)}`}>
                      <Icon className="h-2.5 w-2.5" />
                      {stageLabel(entry.stage)}
                    </span>

                    <span className="text-[11px] font-mono text-foreground truncate min-w-0">
                      {entry.label}
                    </span>

                    {entry.stage !== "project" && (
                      <span className="text-[9px] text-muted-foreground truncate ml-auto shrink-0">
                        from {entry.projectName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-3 py-1.5 bg-muted/20 border-t border-border">
            <p className="text-[9px] text-muted-foreground">
              {isGlobal
                ? "⚡ This is a global project — auto-injected before any matched project."
                : "Injection order: Global → Dependencies (topological) → Project scripts. Each script runs in sequence."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
