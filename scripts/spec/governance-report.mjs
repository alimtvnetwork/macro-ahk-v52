#!/usr/bin/env node
// Governance report — emits markdown summarizing spec health for the
// quarterly review workflow. Pure read-only; no retry.
import { readFileSync, existsSync, statSync } from 'node:fs';

const INDEX = 'spec/21-app/05-prompts/INDEX.json';
if (!existsSync(INDEX)) {
  console.error(`Missing ${INDEX} — run build-index first`);
  process.exit(2);
}
const idx = JSON.parse(readFileSync(INDEX, 'utf8'));

const byTopDir = {};
for (const f of idx.files) {
  const parts = f.path.replace('spec/21-app/05-prompts/', '').split('/');
  const top = parts.length > 1 ? parts[0] : '(root)';
  byTopDir[top] = (byTopDir[top] || 0) + 1;
}

const versions = idx.files
  .filter(f => f.version)
  .reduce((acc, f) => ((acc[f.version] = (acc[f.version] || 0) + 1), acc), {});

const now = new Date().toISOString();

console.log(`# Spec Governance Report — ${now}`);
console.log('');
console.log(`- Total files: **${idx.fileCount}**`);
console.log(`- Index generated: ${idx.generatedAt}`);
console.log('');
console.log('## Files per top-level directory');
console.log('| Directory | Files |');
console.log('|-----------|------:|');
for (const [k, v] of Object.entries(byTopDir).sort()) {
  console.log(`| ${k} | ${v} |`);
}
console.log('');
console.log('## Version distribution');
console.log('| Version | Files |');
console.log('|---------|------:|');
for (const [v, n] of Object.entries(versions).sort()) {
  console.log(`| ${v} | ${n} |`);
}
console.log('');
console.log('## Review checklist (manual)');
console.log('- [ ] BLIND-AI-SMOKE-TEST still 20/20 (see smoke-rescore output)');
console.log('- [ ] No `mem://` refs >30d stale');
console.log('- [ ] OWNERSHIP.md reviewers still valid');
console.log('- [ ] perf budgets in performance/10 still appropriate');
console.log('- [ ] No deprecated fields past their MAJOR removal window');
