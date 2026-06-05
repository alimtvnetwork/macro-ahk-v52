#!/usr/bin/env node
/**
 * Spec audit: every .md under spec/2026-spec/ MUST include at least one
 * pitfall / counter-example / anti-pattern / edge-case / gotcha block so a
 * blind-AI implementer is warned about the failure mode.
 *
 * Exits non-zero with a CODE-RED report listing exact path + missing item +
 * reason, per the Code-Red Logging core rule.
 */
import { readFileSync } from 'node:fs';
import { DEFAULT_SPEC_ROOT, listMarkdownFiles } from './spec-file-list.mjs';

const ROOT_ARG = '--root=';
const SPEC_ROOT = getArg(ROOT_ARG, DEFAULT_SPEC_ROOT);
const PITFALL_RE = /\b(Pitfall|Counter-example|Anti-pattern|Edge case|Gotcha)\b/i;

function getArg(prefix, fallback) {
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const failures = [];
for (const path of listMarkdownFiles(SPEC_ROOT)) {
  const txt = readFileSync(path, 'utf8');
  if (PITFALL_RE.test(txt)) continue;
  failures.push({
    path,
    missing: 'Pitfall|Counter-example|Anti-pattern|Edge case|Gotcha',
    reason: 'Blind-AI spec contract: every file MUST warn the implementer about at least one failure mode.',
  });
}

if (failures.length === 0) {
  console.log(`[check-pitfalls] OK — every ${SPEC_ROOT}/**/*.md file declares a pitfall/counter-example block`);
  process.exit(0);
}

console.error(`[check-pitfalls] CODE RED — ${failures.length} spec file(s) missing pitfalls:`);
for (const f of failures) {
  console.error(`  - path: ${f.path}`);
  console.error(`    missing: ${f.missing}`);
  console.error(`    reason: ${f.reason}`);
}
process.exit(1);
