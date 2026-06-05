#!/usr/bin/env node
/**
 * Spec audit: every quarantined draft under `spec/2026-spec/_quarantine/`
 * MUST declare a `## Graduation Plan` section so it cannot drift into an
 * orphan rule. The directory `README.md` is the policy file and is exempt.
 *
 * Exits non-zero with CODE-RED file/path errors (exact path, missing item,
 * reason) for any quarantined file that lacks the section.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT_ARG = '--root=';
const DEFAULT_ROOT = 'spec/2026-spec/_quarantine';
const SPEC_ROOT = resolve(getArg(ROOT_ARG, DEFAULT_ROOT));
const GRADUATION_RX = /^##\s+Graduation Plan\s*$/im;

function getArg(prefix, fallback) {
  const hit = process.argv.find((value) => value.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function listMarkdown(directoryPath) {
  if (!existsSync(directoryPath)) {
    return [];
  }
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      return listMarkdown(entryPath);
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      return [entryPath];
    }
    return [];
  });
}

function isPolicyFile(path) {
  const lower = path.toLowerCase();
  return lower.endsWith(`${SPEC_ROOT.split('/').pop().toLowerCase()}/readme.md`) || lower.endsWith('/_quarantine/readme.md');
}

const failures = [];
for (const path of listMarkdown(SPEC_ROOT)) {
  if (isPolicyFile(path)) {
    continue;
  }
  const content = readFileSync(path, 'utf8');
  if (GRADUATION_RX.test(content)) {
    continue;
  }
  failures.push({
    path,
    missing: '## Graduation Plan section',
    reason: 'Quarantined drafts MUST declare target folder, blockers, owner mem:// link, and target date before they are allowed to stay parked.',
  });
}

if (failures.length === 0) {
  const count = listMarkdown(SPEC_ROOT).length;
  console.log(`[check-quarantine] OK — ${count} file(s) scanned under ${SPEC_ROOT}; every draft has a Graduation Plan or is the policy README`);
  process.exit(0);
}

console.error(`[check-quarantine] CODE RED — ${failures.length} quarantined file(s) missing a Graduation Plan:`);
for (const f of failures) {
  console.error(`  - path: ${f.path}`);
  console.error(`    missing: ${f.missing}`);
  console.error(`    reason: ${f.reason}`);
}
process.exit(1);
