import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layout, Plus } from "lucide-react";
import { usePersistedState } from "@/hooks/use-persisted-state";

/**
 * Workspace selector for multi-tab synchronization.
 */
export function WorkspaceSelector() {
  const [activeWorkspace, setActiveWorkspace] = usePersistedState<string>(
    "marco-active-workspace",
    "default",
    (raw) => (typeof raw === "string" ? raw : "default")
  );

  return (
    <div className="flex items-center gap-2">
      <Select value={activeWorkspace} onValueChange={setActiveWorkspace}>
        <SelectTrigger className="h-8 w-[140px] bg-background/50 border-border/50 hover:bg-background/80 transition-colors">
          <Layout className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Workspace" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default Workspace</SelectItem>
          <SelectItem value="client-a">Client A</SelectItem>
          <SelectItem value="client-b">Client B</SelectItem>
          <div className="p-2 pt-1 mt-1 border-t border-border/50">
            <button className="flex items-center w-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors">
              <Plus className="h-3 w-3 mr-1.5" />
              New Workspace
            </button>
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
