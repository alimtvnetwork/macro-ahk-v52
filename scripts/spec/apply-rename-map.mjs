#!/usr/bin/env node
// Apply spec rename map — rewrites stale folder references after the
// 2026-06-03 renumber of `spec/2026-spec/01-prompt-spec/` → `spec/2026-spec/01-prompt-spec/` and
// children `10..200` → `01..20`.
//
// Strategy: pair-based substitution keyed on full `NN-name` to disambiguate
// the collision between old `10-glossary` (now `01-glossary`) and new
// `10-queue-model` (formerly `100-queue-model`). Order matters — apply the
// 3-digit names FIRST so `100-…` doesn't get partially eaten by `10-…`.
//
// Usage:
//   node scripts/spec/apply-rename-map.mjs --dry-run
//   node scripts/spec/apply-rename-map.mjs --apply
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DRY = !process.argv.includes('--apply');

const FOLDER_PAIRS = [
  // 3-digit first (longest prefix first to avoid partial overlap)
  ['200-adoption-checklist', '20-adoption-checklist'],
  ['190-reference-snippets', '19-reference-snippets'],
  ['180-test-plan',          '18-test-plan'],
  ['170-onboarding',         '17-onboarding'],
  ['160-observability',      '16-observability'],
  ['150-settings',           '15-settings'],
  ['140-plan-mode',          '14-plan-mode'],
  ['130-failure-handling',   '13-failure-handling'],
  ['120-delay-engine',       '12-delay-engine'],
  ['110-queue-lifecycle',    '11-queue-lifecycle'],
  ['100-queue-model',        '10-queue-model'],
  // 2-digit
  ['90-next-overview',       '09-next-overview'],
  ['80-save-create-edit',    '08-save-create-edit'],
  ['70-editor-adapters',     '07-editor-adapters'],
  ['60-injection-contract',  '06-injection-contract'],
  ['50-ui-contract',         '05-ui-contract'],
  ['40-loader-contract',     '04-loader-contract'],
  ['30-prompt-source-format','03-prompt-source-format'],
  ['20-data-model',          '02-data-model'],
  ['10-glossary',            '01-glossary'],
];

const ROOT_PAIR = ['spec/2026-spec/01-prompt-spec/', 'spec/2026-spec/01-prompt-spec/'];

const TARGET_ROOTS = [
  'spec/2026-spec',
  // Repo-wide passes are done later via --root flag; default scope is the
  // renamed spec tree (Phase D scope per plan).
];

const EXT_RE = /\.(md|json|html|mjs|ts|tsx|yml|yaml)$/i;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (EXT_RE.test(e)) out.push(p);
  }
  return out;
}

function rewrite(text) {
  let next = text;
  let count = 0;
  // Pairs first (within-spec relative + absolute deep refs)
  for (const [oldN, newN] of FOLDER_PAIRS) {
    // word-boundary-ish: must be preceded by /, start, or whitespace, and followed by / or end-of-segment
    const re = new RegExp(`(?<![\\w-])${oldN}(?=[/\`\\s)"'\\]:.,]|$)`, 'g');
    next = next.replace(re, () => { count++; return newN; });
  }
  // Root path last
  next = next.replace(new RegExp(ROOT_PAIR[0].replace(/\//g,'\\/'), 'g'),
                       () => { count++; return ROOT_PAIR[1]; });
  return { text: next, count };
}

let totalFiles = 0, totalEdits = 0, changedFiles = 0;
const changes = [];
const rootArg = process.argv.find(a => a.startsWith('--root='));
const roots = rootArg ? [rootArg.slice('--root='.length)] : TARGET_ROOTS;

for (const root of roots) {
  for (const file of walk(root)) {
    totalFiles++;
    const before = readFileSync(file, 'utf8');
    const { text, count } = rewrite(before);
    if (count > 0 && text !== before) {
      changedFiles++; totalEdits += count;
      changes.push({ file, count });
      if (!DRY) writeFileSync(file, text);
    }
  }
}

console.log(`[apply-rename-map] mode=${DRY ? 'DRY-RUN' : 'APPLY'}  roots=${roots.join(',')}`);
console.log(`[apply-rename-map] scanned=${totalFiles} changed=${changedFiles} edits=${totalEdits}`);
for (const c of changes.slice(0, 25)) console.log(`  ${c.count.toString().padStart(4)}  ${c.file}`);
if (changes.length > 25) console.log(`  ... +${changes.length - 25} more`);
