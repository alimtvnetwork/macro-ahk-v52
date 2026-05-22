/**
 * Auto-Attach Diagnostics Panel
 *
 * Surfaces the latest `evaluateAutoAttach` decisions for the current
 * project so users can see *why* a library script was (or wasn't)
 * auto-attached. Read-only — refreshes after each project save via the
 * `GET_AUTO_ATTACH_DECISIONS` background message.
 *
 * Backed by mem://features/auto-attach-policy.md §4 "Diagnostics tab".
 */

import { useEffect, useState } from "react";
import { getPlatform } from "@/platform";
import { MessageType } from "@/shared/messages";

interface Decision {
  scriptId: string;
  scriptName: string;
  ok: boolean;
  reason: string;
  detail: string;
}

interface Record {
  projectId: string;
  projectName: string;
  evaluatedAt: string;
  decisions: Decision[];
}

interface Props {
  projectId: string;
  autoStart: boolean;
  refreshKey: number;
}

function reasonBadge(reason: string, ok: boolean): { label: string; cls: string } {
  if (ok) return { label: "OK", cls: "bg-green-500/15 text-green-300 border-green-500/30" };
  if (reason === "AUTOATTACH_SKIPPED_AUTOSTART_OFF")
    return { label: "autoStart off", cls: "bg-muted/40 text-muted-foreground border-border" };
  if (reason === "AUTOATTACH_SKIPPED_URL_NO_MATCH")
    return { label: "URL no match", cls: "bg-amber-500/10 text-amber-300 border-amber-500/30" };
  if (reason === "AUTOATTACH_ALREADY_ATTACHED")
    return { label: "Already attached", cls: "bg-blue-500/10 text-blue-300 border-blue-500/30" };
  if (reason === "AUTOATTACH_SKIPPED_OPT_OUT")
    return { label: "Opted out", cls: "bg-muted/40 text-muted-foreground border-border" };
  return { label: reason.replace("AUTOATTACH_SKIPPED_", "").toLowerCase(), cls: "bg-red-500/10 text-red-300 border-red-500/30" };
}

export function AutoAttachDiagnosticsPanel({ projectId, autoStart, refreshKey }: Props) {
  const [record, setRecord] = useState<Record | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPlatform()
      .sendMessage<{ record: Record | null }>({ type: MessageType.GET_AUTO_ATTACH_DECISIONS, projectId })
      .then((res) => {
        if (alive) setRecord(res?.record ?? null);
      })
      .catch(() => {
        if (alive) setRecord(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [projectId, refreshKey]);

  return (
    <div className="rounded-md border border-border bg-card/40 p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">Auto-Attach Diagnostics</h4>
        <span className="text-xs text-muted-foreground">
          autoStart: <span className={autoStart ? "text-green-400" : "text-muted-foreground"}>{autoStart ? "ON" : "OFF"}</span>
          {record?.evaluatedAt ? ` · evaluated ${new Date(record.evaluatedAt).toLocaleTimeString()}` : ""}
        </span>
      </div>
      {!autoStart && (
        <p className="text-xs text-muted-foreground">
          Enable <code className="px-1 rounded bg-muted/40">autoStart</code> in project settings to auto-attach matching library scripts.
        </p>
      )}
      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {!loading && record && record.decisions.length === 0 && (
        <p className="text-xs text-muted-foreground">No library scripts evaluated yet. Save the project to run evaluation.</p>
      )}
      {!loading && record && record.decisions.length > 0 && (
        <ul className="space-y-1 max-h-48 overflow-auto">
          {record.decisions.map((d) => {
            const b = reasonBadge(d.reason, d.ok);
            return (
              <li key={d.scriptId} className="flex items-start gap-2 text-xs">
                <span className={`shrink-0 px-1.5 py-0.5 rounded border ${b.cls}`}>{b.label}</span>
                <span className="font-mono">{d.scriptName}</span>
                <span className="text-muted-foreground truncate" title={d.detail}>— {d.detail}</span>
              </li>
            );
          })}
        </ul>
      )}
      {!loading && !record && (
        <p className="text-xs text-muted-foreground">No evaluation record yet. Save the project to populate.</p>
      )}
    </div>
  );
}
