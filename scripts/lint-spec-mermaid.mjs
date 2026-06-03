#!/usr/bin/env node
// H5 — Zero-dep Mermaid lint for spec/01-prompt-spec-2026/*.mmd.
// Verifies each diagram has a known directive header and balanced
// brackets/parens/braces. Skips full render (would need mermaid-cli +
// headless Chromium); this catches the breakages that matter.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "spec/01-prompt-spec-2026";
const DIRECTIVES = [
  "graph", "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram",
  "stateDiagram-v2", "erDiagram", "journey", "gantt", "pie", "mindmap",
  "timeline", "quadrantChart", "C4Context", "C4Container", "C4Component",
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.mmd$/.test(name)) out.push(p);
  }
  return out;
}

const errors = [];
const files = walk(ROOT);

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);

  // First non-blank, non-comment, non-init line must be a directive.
  const firstReal = lines.find((l) => {
    const t = l.trim();
    return t.length > 0 && !t.startsWith("%%") && !t.startsWith("---");
  });
  if (!firstReal) {
    errors.push(`${file}: empty diagram`);
    continue;
  }
  const head = firstReal.trim().split(/\s+/)[0];
  if (!DIRECTIVES.includes(head)) {
    errors.push(`${file}: unknown directive "${head}" (expected one of ${DIRECTIVES.slice(0, 6).join(", ")}…)`);
  }

  // Tabs cause Mermaid parse issues — flag them.
  lines.forEach((l, i) => {
    if (l.includes("\t")) errors.push(`${file}:${i + 1}: tab character (Mermaid prefers spaces)`);
  });

  // Bracket balance across the whole file (cheap sanity check).
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const counts = { "(": 0, ")": 0, "[": 0, "]": 0, "{": 0, "}": 0 };
  // Strip %% comments first.
  for (const raw of lines) {
    const line = raw.replace(/%%.*$/, "");
    for (const ch of line) if (ch in counts) counts[ch]++;
  }
  for (const open of Object.keys(pairs)) {
    if (counts[open] !== counts[pairs[open]]) {
      errors.push(`${file}: unbalanced ${open}${pairs[open]} (open=${counts[open]} close=${counts[pairs[open]]})`);
    }
  }
}

if (!files.length) { console.error(`✗ no .mmd files found under ${ROOT}`); process.exit(1); }
if (errors.length) {
  console.error(`✗ mermaid lint violations: ${errors.length}`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`✓ mermaid lint clean (${files.length} diagram${files.length === 1 ? "" : "s"})`);
