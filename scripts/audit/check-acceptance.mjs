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
import { globSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SPEC_ROOT = 'spec/2026-spec';
const EXEMPT = /(^|\/)(README|00-overview|00-method|GLOSSARY|ACCEPTANCE-MATRIX|IMPLEMENTATION-CHECKLIST|BLIND-AI-SMOKE-TEST)\.md$/i;

function listMd() {
  // node 22 globSync; fallback to shell find for older nodes
  try {
    return globSync(`${SPEC_ROOT}/**/*.md`);
  } catch {
    return execSync(`find ${SPEC_ROOT} -type f -name '*.md'`).toString().trim().split('\n');
  }
}

const failures = [];
for (const path of listMd()) {
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
