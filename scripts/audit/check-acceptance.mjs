#!/usr/bin/env node
/**
 * Spec audit: every .md under spec/2026-spec/ MUST have an "## Acceptance"
 * heading followed by at least one machine-checkable bullet (- [ ] or - [x]).
 *
 * Exits non-zero with a CODE-RED report listing exact path + missing item +
 * reason, per the Code-Red Logging core rule (mem://standards/error-logging-requirements).
 *
 * Allowlist: README.md, 00-method.md, *.mmd, *.schema.json. Index/overview
 * files matching /(^|\/)(README|00-overview|00-method)\.md$/ are exempt.
 */
import { readFileSync } from 'node:fs';
import { DEFAULT_SPEC_ROOT, listMarkdownFiles } from './spec-file-list.mjs';

const ROOT_ARG = '--root=';
const SPEC_ROOT = getArg(ROOT_ARG, DEFAULT_SPEC_ROOT);
const EXEMPT = /(^|\/)(README|00-overview|00-method|GLOSSARY|ACCEPTANCE-MATRIX|IMPLEMENTATION-CHECKLIST|BLIND-AI-SMOKE-TEST)\.md$/i;

function getArg(prefix, fallback) {
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const failures = [];
for (const path of listMarkdownFiles(SPEC_ROOT)) {
  if (EXEMPT.test(path)) continue;
  const txt = readFileSync(path, 'utf8');
  const hasHeading = /^##\s+Acceptance\b/m.test(txt);
  const hasBullet = /^\s*- \[[ x]\]\s+\S/m.test(txt);
  if (!hasHeading || !hasBullet) {
    failures.push({
      path,
      missing: !hasHeading ? '## Acceptance heading' : 'machine-checkable bullet (- [ ])',
      reason: 'Blind-AI spec contract: every file MUST declare acceptance criteria the AI can self-verify.',
    });
  }
}

if (failures.length === 0) {
  console.log(`[check-acceptance] OK — all ${SPEC_ROOT}/**/*.md files have ## Acceptance + bullets`);
  process.exit(0);
}

console.error(`[check-acceptance] CODE RED — ${failures.length} spec file(s) missing acceptance contract:`);
for (const f of failures) {
  console.error(`  - path: ${f.path}`);
  console.error(`    missing: ${f.missing}`);
  console.error(`    reason: ${f.reason}`);
}
process.exit(1);
