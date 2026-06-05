#!/usr/bin/env node
/**
 * Spec audit: cross-folder topics must cite the owner mem:// rule so copied
 * prose cannot drift from project memory.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT_ARG = '--root=';
const ROOT = getArg(ROOT_ARG, 'spec/2026-spec');

const RULES = [
  {
    topic: 'verbose-logging',
    trigger: /\b(verbose logging|VerboseLogging)\b/i,
    owners: [
      'mem://standards/verbose-logging-and-failure-diagnostics',
      'mem://features/verbose-logging-toggle',
    ],
  },
];

function getArg(prefix, fallback) {
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_')) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      walk(p, out);
      continue;
    }
    if (name.endsWith('.md') && name !== 'OWNERS.md') {
      out.push(p);
    }
  }
  return out;
}

const failures = [];
for (const file of walk(ROOT)) {
  const text = readFileSync(file, 'utf8');
  for (const rule of RULES) {
    if (!rule.trigger.test(text)) continue;
    if (rule.owners.some((owner) => text.includes(owner))) {
      continue;
    }
    failures.push({ file, topic: rule.topic, owners: rule.owners });
  }
}

if (failures.length === 0) {
  console.log(`[check-cross-folder-owners] OK — cross-folder topic references under ${ROOT} cite owner mem:// URLs`);
  process.exit(0);
}

console.error(`[check-cross-folder-owners] CODE RED — ${failures.length} owner reference issue(s):`);
for (const failure of failures) {
  console.error(`  - path: ${relative('.', failure.file)}`);
  console.error(`    missing: owner mem:// link for "${failure.topic}"`);
  console.error(`    reason: Cross-folder rules must cite one owner to prevent duplicate-rule drift; expected one of ${failure.owners.join(', ')}.`);
}
process.exit(1);
