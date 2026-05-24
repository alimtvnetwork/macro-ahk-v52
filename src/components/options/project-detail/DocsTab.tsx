/* eslint-disable @typescript-eslint/no-explicit-any -- untyped extension message types */
/**
 * Extracted from ProjectDetailView.tsx (PERF-R1) — Docs tab.
 *
 * Renders the SDK developer reference card, the on-demand schema-docs
 * generator (Markdown / Prisma) and embeds the DevGuideSection viewer.
 */
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Database, RefreshCw, FileCode, Braces } from "lucide-react";
import { toast } from "sonner";
import { sendMessage } from "@/lib/message-client";
import { DevGuideSection } from "../DevGuideSection";

interface DocsTabProps {
  namespace: string;
  slug: string;
  targetUrls?: import("../DevGuideSection").DevGuideTargetUrl[];
}

// eslint-disable-next-line max-lines-per-function
export function DocsTab({ namespace, slug, targetUrls }: DocsTabProps) {
  const [generating, setGenerating] = useState(false);
  const [docsOutput, setDocsOutput] = useState<{ markdown?: string; prisma?: string } | null>(null);
  const [docsFormat, setDocsFormat] = useState<"markdown" | "prisma">("markdown");

  const handleGenerateDocs = useCallback(async () => {
    setGenerating(true);
    try {
      const resp = await sendMessage<{ isOk: boolean; markdown?: string; prisma?: string; errorMessage?: string }>({
        type: "GENERATE_SCHEMA_DOCS" as any,
        project: slug,
        format: "both",
      });
      if (resp.isOk) {
        setDocsOutput({ markdown: resp.markdown, prisma: resp.prisma });
        toast.success("Schema docs generated");
      } else {
        toast.error(resp.errorMessage ?? "Failed to generate docs");
      }
    } catch {
      toast.error("Failed to generate docs");
    } finally {
      setGenerating(false);
    }
  }, [slug]);

  const activeDoc = docsFormat === "markdown" ? docsOutput?.markdown : docsOutput?.prisma;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          SDK Developer Reference
        </h3>
        <p className="text-xs text-muted-foreground">
          All project data is accessible from injected scripts via the SDK namespace. Scripts run in the page's MAIN world
          and communicate with the extension background via a message bridge.
        </p>
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground font-medium">Project Slug</p>
          <code className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded select-all block w-fit">
            {slug}
          </code>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground font-medium">SDK Namespace</p>
          <code className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded select-all block w-fit">
            {namespace}
          </code>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground font-medium">Available Sub-Namespaces</p>
          <div className="flex flex-wrap gap-1.5">
            {["vars", "urls", "xpath", "cookies", "kv", "files", "meta", "log", "db", "api", "scripts"].map((ns) => (
              <code key={ns} className="text-[10px] font-mono text-foreground bg-muted/30 px-2 py-0.5 rounded border border-border/50">
                {namespace}.{ns}
              </code>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Schema Documentation
          </h3>
          <Button size="sm" variant="outline" onClick={handleGenerateDocs} disabled={generating} className="gap-1.5">
            {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
            {generating ? "Generating…" : "Generate Docs"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Generate Markdown and Prisma-style documentation from this project's database schema.
        </p>

        {docsOutput && (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <Button size="sm" variant={docsFormat === "markdown" ? "default" : "outline"} onClick={() => setDocsFormat("markdown")} className="text-xs h-7 gap-1">
                <FileCode className="h-3 w-3" /> Markdown
              </Button>
              <Button size="sm" variant={docsFormat === "prisma" ? "default" : "outline"} onClick={() => setDocsFormat("prisma")} className="text-xs h-7 gap-1">
                <Braces className="h-3 w-3" /> Prisma
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7 gap-1 ml-auto"
                onClick={() => {
                  if (activeDoc) {
                    navigator.clipboard.writeText(activeDoc);
                    toast.success("Copied to clipboard");
                  }
                }}
              >
                Copy
              </Button>
            </div>
            <pre className="text-[10px] font-mono bg-muted/30 border border-border rounded-lg p-3 max-h-[400px] overflow-auto whitespace-pre-wrap text-foreground">
              {activeDoc || "(empty)"}
            </pre>
          </div>
        )}
      </div>

      <DevGuideSection namespace={namespace} section="all" targetUrls={targetUrls} />
    </div>
  );
}
