#!/usr/bin/env node
// H9 — Typecheck the spec's reference snippets in isolation.
//   1. Extract every ```ts fenced block from 190-reference-snippets/*.md
//   2. Drop into /tmp/spec-snippets/ with a shared shim .d.ts
//   3. Run `tsc --noEmit` against an isolated tsconfig.
// Zero new deps — uses the project's existing typescript install.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SRC = "spec/2026-prompts-generic/190-reference-snippets";
const OUT = "/tmp/spec-snippets";

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// --- shared shims --------------------------------------------------
// The snippets import from "../20-data-model", "../70-editor-adapters",
// "../100-queue-model". Those paths are spec docs, not TS modules; stub them.
const shims = {
  "20-data-model.ts": `
export interface Prompt {
  id: string; slug: string; title: string; version: string; author: string;
  categories: string[]; body: string; isDefault: boolean; order: number;
  createdAt: string; updatedAt: string;
}
export interface PromptCategory { slug: string; label: string; order: number; }
export interface PromptStore {
  list(): Promise<Prompt[]>;
  get(id: string): Promise<Prompt | null>;
  save(p: Prompt): Promise<Prompt>;
  delete(id: string): Promise<void>;
  import(batch: Prompt[]): Promise<void>;
  export(): Promise<Prompt[]>;
}
`,
  "70-editor-adapters.ts": `
export type PasteMode = "replace" | "append" | "at-cursor";
export interface EditorAdapter {
  kind: string;
  match(el: Element): el is HTMLElement;
  paste(el: Element, text: string, mode?: PasteMode): Promise<boolean>;
}
`,
  "100-queue-model.ts": `
export type TaskStatus = "pending" | "processing" | "hold" | "completed" | "failed";
export interface QueuedTask {
  id: string; kind: string; body: string; status: TaskStatus;
  retryCount: number; holdUntil?: string; createdAt: string;
}
export interface QueueStore {
  enqueue(t: QueuedTask): Promise<void>;
  enqueueBulk(ts: QueuedTask[]): Promise<void>;
  nextPending(): Promise<QueuedTask | null>;
  markProcessing(id: string): Promise<void>;
  markCompleted(id: string): Promise<void>;
  markFailed(id: string, reason: string, detail: string): Promise<void>;
  clearPending(): Promise<void>;
  requeue(id: string): Promise<void>;
}
`,
};
for (const [name, body] of Object.entries(shims)) writeFileSync(join(OUT, name), body.trimStart());

// --- extract snippets ----------------------------------------------
const TS_RE = /```ts\s*\n([\s\S]*?)```/g;
let extracted = 0;
for (const file of readdirSync(SRC).sort()) {
  if (!/\.md$/.test(file)) continue;
  const text = readFileSync(join(SRC, file), "utf8");
  let idx = 0;
  for (const m of text.matchAll(TS_RE)) {
    idx++;
    const stem = file.replace(/\.md$/, "");
    writeFileSync(join(OUT, `${stem}.snippet-${idx}.ts`), m[1]);
    extracted++;
  }
}
if (!extracted) { console.error(`✗ no \`\`\`ts blocks found in ${SRC}`); process.exit(1); }

// --- tsconfig -------------------------------------------------------
writeFileSync(join(OUT, "tsconfig.json"), JSON.stringify({
  compilerOptions: {
    target: "ES2022", module: "ESNext", moduleResolution: "Bundler",
    strict: true, noEmit: true, skipLibCheck: true,
    lib: ["ES2022", "DOM"], types: [],
  },
  include: ["./*.ts"],
}, null, 2));

// --- run tsc --------------------------------------------------------
const tsc = spawnSync("node_modules/.bin/tsc", ["-p", OUT], { encoding: "utf8" });
if (tsc.status !== 0) {
  console.error(`✗ snippet typecheck failed (${extracted} snippet${extracted === 1 ? "" : "s"})`);
  if (tsc.stdout) console.error(tsc.stdout);
  if (tsc.stderr) console.error(tsc.stderr);
  process.exit(1);
}
console.log(`✓ snippet typecheck clean (${extracted} snippet${extracted === 1 ? "" : "s"})`);
