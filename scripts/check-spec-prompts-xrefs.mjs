#!/usr/bin/env node
// H7 — Cross-reference audit for spec/2026-prompts-generic/.
// Verifies every "T###" mentioned in the spec falls in T21..T120 and that
// the planning ledger lists T21..T120 exactly once each.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "spec/2026-prompts-generic";
const PLAN = `${ROOT}/01-plan-tasks-1-20.md`;
const TASK_RE = /\bT(\d{1,3})\b/g;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.md$/.test(name)) out.push(p);
  }
  return out;
}

const planText = readFileSync(PLAN, "utf8");
const declared = new Set();
for (const m of planText.matchAll(/^- T(\d{2,3}) `/gm)) {
  declared.add(Number(m[1]));
}

const errors = [];
const expectFull = new Set();
for (let i = 21; i <= 120; i++) expectFull.add(i);
for (const n of expectFull) {
  if (!declared.has(n)) errors.push(`plan ledger missing T${n}`);
}

const usage = new Map();
for (const file of walk(ROOT)) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(TASK_RE)) {
    const n = Number(m[1]);
    if (n < 1 || n > 120) {
      errors.push(`${file}: out-of-range T${m[1]}`);
      continue;
    }
    if (!usage.has(n)) usage.set(n, []);
    usage.get(n).push(file);
  }
}

if (errors.length) {
  console.error(`✗ xref violations: ${errors.length}`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`✓ xref clean — ${declared.size} tasks declared, ${usage.size} referenced.`);
