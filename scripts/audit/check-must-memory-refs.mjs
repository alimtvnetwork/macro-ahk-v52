#!/usr/bin/env node
/**
 * Spec audit: every spec file that states a normative MUST / SHALL rule
 * MUST cite at least one `mem://` URL so the rule traces back to a project
 * memory owner. Prevents new MUSTs from drifting unbacked.
 *
 * Skips audit/archive output, index files, and code fences (since example
 * snippets often contain MUST words inside generated logs).
 */
import { readFileSync } from 'node:fs';
import { DEFAULT_SPEC_ROOT, listMarkdownFiles } from './spec-file-list.mjs';

const ROOT_ARG = '--root=';
const SPEC_ROOT = getArg(ROOT_ARG, DEFAULT_SPEC_ROOT);
const SKIP_PATH_RX = /(?:\/_archive|\/99-spec-issues\/|(?:^|\/)(?:README|OWNERS|ACCEPTANCE-MATRIX|IMPLEMENTATION-CHECKLIST)\.md$)/;
const MUST_RX = /\b(MUST(?:\s+NOT)?|SHALL(?:\s+NOT)?)\b/;
const MEM_RX = /mem:\/\/[\w./~-]+/;

function getArg(prefix, fallback) {
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function stripFences(content) {
  return content.replace(/```[\s\S]*?```/g, '');
}

const failures = [];
for (const path of listMarkdownFiles(SPEC_ROOT)) {
  if (SKIP_PATH_RX.test(path)) continue;
  const content = readFileSync(path, 'utf8');
  const prose = stripFences(content);
  if (!MUST_RX.test(prose)) continue;
  if (MEM_RX.test(content)) continue;
  failures.push({
    path,
    missing: 'mem:// owner reference',
    reason: 'Blind-AI spec contract: every MUST/SHALL rule must link to its project-memory owner.',
  });
}

if (failures.length === 0) {
  console.log(`[check-must-memory-refs] OK — every MUST/SHALL spec under ${SPEC_ROOT} cites a mem:// owner`);
  process.exit(0);
}

console.error(`[check-must-memory-refs] CODE RED — ${failures.length} spec file(s) state MUST/SHALL without a mem:// owner:`);
for (const f of failures) {
  console.error(`  - path: ${f.path}`);
  console.error(`    missing: ${f.missing}`);
  console.error(`    reason: ${f.reason}`);
}
console.error('');
console.error('Fix: append an owner footer such as:');
console.error('  > Owner: see [<title>](mem://<path>) for the authoritative rule.');
process.exit(1);
