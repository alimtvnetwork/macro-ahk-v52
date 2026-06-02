#!/usr/bin/env node
// H6 — Concatenate every spec/2026-prompts-generic/*.md into a single
// printable markdown bundle. Avoids extra deps; markdown is browser-printable
// and the user can convert to PDF via any tool.
//
// Writes: /mnt/documents/2026-prompts-spec.md

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "spec/2026-prompts-generic";
const OUT  = "/mnt/documents/2026-prompts-spec.md";

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(md|mmd)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const parts = [
  "# 2026 Prompts (generic) — Combined spec bundle",
  "",
  `Bundled ${files.length} files from \`${ROOT}/\` for printing.`,
  "",
  "---",
  "",
];
for (const f of files) {
  const rel = relative(ROOT, f).replaceAll("\\", "/");
  parts.push(`\n\n<!-- ===== ${rel} ===== -->\n`);
  parts.push(`## \`${rel}\``, "");
  parts.push(readFileSync(f, "utf8").trimEnd());
  parts.push("", "---", "");
}

mkdirSync("/mnt/documents", { recursive: true });
writeFileSync(OUT, parts.join("\n"));
const sizeKB = Math.round(Buffer.byteLength(parts.join("\n")) / 1024);
console.log(`✓ wrote ${OUT}  (${files.length} files, ${sizeKB} KB)`);
