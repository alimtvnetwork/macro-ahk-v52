#!/usr/bin/env node
// H4 — Validate every fenced ```json block in
// spec/2026-prompts-generic/30-prompt-source-format/02-info-json.md
// against the info.json contract defined there. Zero-dep validator.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "spec/2026-prompts-generic/30-prompt-source-format";
const REQUIRED = [
  ["id",         "string"],
  ["slug",       "string"],
  ["title",      "string"],
  ["version",    "string"],
  ["author",     "string"],
  ["categories", "array"],
  ["isDefault",  "boolean"],
  ["order",      "number"],
  ["createdAt",  "string"],
  ["updatedAt",  "string"],
];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function typeOf(v) {
  if (Array.isArray(v)) return "array";
  if (v === null) return "null";
  return typeof v;
}

function extractJsonBlocks(text) {
  const out = [];
  const re = /```json\s*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
}

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

const errors = [];
let validated = 0;

for (const file of walk(ROOT)) {
  // Only validate info.json examples (02-info-json.md). 05-import-export
  // shows zip manifest schema, different contract.
  if (!/02-info-json\.md$/.test(file)) continue;

  const blocks = extractJsonBlocks(readFileSync(file, "utf8"));
  for (let i = 0; i < blocks.length; i++) {
    const where = `${file} block#${i + 1}`;
    let obj;
    try { obj = JSON.parse(blocks[i]); }
    catch (e) { errors.push(`${where}: JSON parse — ${e.message}`); continue; }

    for (const [k, t] of REQUIRED) {
      if (!(k in obj)) { errors.push(`${where}: missing "${k}"`); continue; }
      if (typeOf(obj[k]) !== t) errors.push(`${where}: "${k}" expected ${t}, got ${typeOf(obj[k])}`);
    }
    if (typeof obj.slug === "string" && !SLUG_RE.test(obj.slug))
      errors.push(`${where}: slug "${obj.slug}" fails ${SLUG_RE}`);
    if (typeof obj.version === "string" && !SEMVER_RE.test(obj.version))
      errors.push(`${where}: version "${obj.version}" not semver`);
    if (typeof obj.createdAt === "string" && !ISO_RE.test(obj.createdAt))
      errors.push(`${where}: createdAt "${obj.createdAt}" not ISO-8601 UTC`);
    if (typeof obj.updatedAt === "string" && !ISO_RE.test(obj.updatedAt))
      errors.push(`${where}: updatedAt "${obj.updatedAt}" not ISO-8601 UTC`);
    if (Array.isArray(obj.categories) && !obj.categories.every((c) => typeof c === "string"))
      errors.push(`${where}: categories must be string[]`);
    validated++;
  }
}

if (!validated) { console.error(`✗ no info.json examples found under ${ROOT}`); process.exit(1); }
if (errors.length) {
  console.error(`✗ info.json schema violations: ${errors.length}`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`✓ info.json clean (${validated} example${validated === 1 ? "" : "s"})`);
