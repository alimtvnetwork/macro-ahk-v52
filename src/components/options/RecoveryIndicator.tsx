import React, { useEffect, useState } from "react";
import { History, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Indicates state synchronization and recovery status.
 */
export function RecoveryIndicator() {
  const [status, setStatus] = useState<"synced" | "syncing" | "error">("synced");

  // Mock sync activity
  useEffect(() => {
    const channel = new BroadcastChannel("marco-sync-activity");
    channel.onmessage = () => {
      setStatus("syncing");
      setTimeout(() => setStatus("synced"), 800);
    };
    return () => channel.close();
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30 border border-border/50 text-[10px] text-muted-foreground transition-all duration-300">
      {status === "syncing" ? (
        <>
          <History className="h-3 w-3 animate-spin text-primary" />
          <span>Syncing tabs...</span>
        </>
      ) : status === "synced" ? (
        <>
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span>Workspace synced</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span>Sync error</span>
        </>
      )}
    </div>
  );
}
