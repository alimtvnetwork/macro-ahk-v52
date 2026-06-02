#!/usr/bin/env node
// Spec banlist linter — enforces vocabulary banlist (T24) across
// spec/2026-prompts-generic/. Fails fast (No-Retry policy).
//
// Usage: node scripts/lint-spec-banlist.mjs
// Exit 0 = clean, 1 = violations found.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "spec/2026-prompts-generic";
const BANNED = [
  /\bMacroController\b/,
  /\bRiseupAsia[A-Za-z]*/,
  /\bchrome\.[a-zA-Z]+/,
  /\bSupabase\b/i,
  /\bMarco SDK\b/,
];
const ALLOW_FILES = new Set([
  // Meta-docs that document the banlist by quoting the forbidden terms.
  "00-overview.md",
  "01-plan-tasks-1-20.md",
  "10-glossary/04-vocabulary-banlist.md",
  "200-adoption-checklist/03-go-live-checklist.md",
  "200-adoption-checklist/04-worked-example.md",
  "200-adoption-checklist/05-handoff.md",
]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(md|mmd|ts)$/.test(name)) out.push(p);
  }
  return out;
}

const violations = [];
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  if (ALLOW_FILES.has(rel)) continue;
  const text = readFileSync(file, "utf8");
  text.split(/\r?\n/).forEach((line, i) => {
    for (const rx of BANNED) {
      const m = line.match(rx);
      if (m) {
        violations.push({
          path: file,
          line: i + 1,
          term: m[0],
          excerpt: line.trim().slice(0, 140),
        });
      }
    }
  });
}

if (violations.length === 0) {
  console.log(`✓ spec banlist clean (${ROOT})`);
  process.exit(0);
}

console.error(`✗ spec banlist violations: ${violations.length}`);
for (const v of violations) {
  console.error(`  ${v.path}:${v.line}  [${v.term}]  ${v.excerpt}`);
}
process.exit(1);
