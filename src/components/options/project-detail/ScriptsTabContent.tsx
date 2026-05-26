/**
 * Extracted from ProjectDetailView.tsx (PERF-R1) — Scripts tab.
 *
 * Resolves project script bindings against the available script + config
 * libraries, surfaces unbound paths, and persists edits via onSave.
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { StoredProject, StoredScript, StoredConfig } from "@/hooks/use-projects-scripts";
import { ProjectScriptSelector, type ScriptBinding } from "../ProjectScriptSelector";
import { logError } from "../options-logger";

interface ScriptsTabContentProps {
  project: StoredProject;
  availableScripts: StoredScript[];
  availableConfigs: StoredConfig[];
  onSave: (project: Partial<StoredProject>) => Promise<void>;
}

function formatJson(input: string | number | boolean | null | undefined): string {
  if (typeof input === "string") {
    try {
      return JSON.stringify(JSON.parse(input), null, 2);
    } catch {
      return input;
    }
  }
  try {
    return JSON.stringify(input ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

// eslint-disable-next-line max-lines-per-function
export function ScriptsTabContent({ project, availableScripts, availableConfigs, onSave }: ScriptsTabContentProps) {
  const [pendingBindings, setPendingBindings] = useState<ScriptBinding[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const findScript = (path: string) => {
    const exact = availableScripts.find((as) => as.name === path);
    if (exact) return exact;
    const basename = path.includes("/") ? path.split("/").pop()! : path;
    return availableScripts.find((as) => as.name === basename || as.name.endsWith("/" + basename));
  };

  const findConfig = (idOrPath: string) => {
    const byId = availableConfigs.find((c) => c.id === idOrPath);
    if (byId) return byId;
    const byName = availableConfigs.find((c) => c.name === idOrPath);
    if (byName) return byName;
    const basename = idOrPath.includes("/") ? idOrPath.split("/").pop()! : idOrPath;
    return availableConfigs.find((c) => c.name === basename || c.name.endsWith("/" + basename));
  };

  const unboundPaths = useMemo(() => {
    const set = new Set<string>();
    for (const s of project.scripts ?? []) {
      if (!findScript(s.path)) {
        set.add(s.path);
      }
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute on library or project changes
  }, [project.scripts, availableScripts]);

  useEffect(() => {
    const projectPaths = (project.scripts ?? []).map((s) => s.path);
    const libraryNames = availableScripts.map((s) => s.name);
    const unbound = Array.from(unboundPaths);
    console.groupCollapsed(
      `[Options.ScriptsTab] project="${project.name}" scripts=${projectPaths.length} unbound=${unbound.length}`,
    );
    console.log("project.scripts paths:", projectPaths);
    console.log("availableScripts names:", libraryNames);
    console.log("unbound paths:", unbound);
    console.groupEnd();
    if (unbound.length > 0) {
      logError(
        "ScriptsTab.UnboundBinding",
        `Project bindings reference scripts missing from the library.\n  Project: ${project.id} (${project.name})\n  Missing: ${unbound.join(", ")}\n  Reason: No StoredScript.name matches saved project.scripts[].path (exact, basename, or suffix). Library has ${libraryNames.length} scripts; check for rename or missing seed.`,
      );
    }
  }, [project.id, project.name, project.scripts, availableScripts, unboundPaths]);

  const bindings: ScriptBinding[] = (project.scripts ?? []).map((s) => {
    const matched = findScript(s.path);
    const bindingIds = s.configBinding
      ? s.configBinding.split(",").map((id) => id.trim()).filter(Boolean)
      : [];
    const configBindings = bindingIds
      .map((id, i) => {
        const config = findConfig(id);
        return config ? { configId: config.id, configName: config.name, json: formatJson(config.json), order: i } : null;
      })
      .filter((x): x is { configId: string; configName: string; json: string; order: number } => x !== null);

    return {
      scriptId: matched?.id ?? s.path,
      scriptName: s.path,
      order: s.order,
      runAt: s.runAt ?? "document_idle",
      code: s.code ?? matched?.code ?? "",
      configBindings,
    };
  });

  const handleChange = (newBindings: ScriptBinding[]) => {
    setPendingBindings(newBindings);
  };

  const handleSave = async () => {
    const source = pendingBindings ?? bindings;
    setIsSaving(true);
    const scripts = source.map((b, i) => ({
      path: b.scriptName,
      order: i,
      runAt: b.runAt,
      configBinding: b.configBindings.map((c) => c.configId).join(",") || undefined,
      code: b.code || undefined,
    }));
    await onSave({ id: project.id, scripts });
    setPendingBindings(null);
    setIsSaving(false);
    toast.success("Scripts saved");
  };

  const isDirty = pendingBindings !== null;

  return (
    <div className="space-y-3">
      <ProjectScriptSelector
        availableScripts={availableScripts}
        availableConfigs={availableConfigs}
        selectedScripts={pendingBindings ?? bindings}
        onChange={handleChange}
        unboundScriptNames={unboundPaths}
      />
      <div className="flex items-center justify-end gap-2">
        {isDirty && (
          <span className="text-[10px] text-primary font-medium">● Unsaved changes</span>
        )}
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {isSaving ? "Saving…" : "Save Scripts"}
        </Button>
      </div>
    </div>
  );
}
