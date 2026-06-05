#!/usr/bin/env node
/**
 * Spec audit: every relative markdown link under spec/2026-spec/ MUST resolve
 * to an existing file. Skips http(s), mailto, anchors-only.
 *
 * CODE-RED report per mem://standards/error-logging-requirements: exact path,
 * missing target, and reason.
 */
import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const SPEC_ROOT = 'spec/2026-spec';
const LINK_RE = /\[[^\]]+\]\(([^)\s#]+)(?:#[^)]*)?\)/g;

function listMd() {
  try {
    return globSync(`${SPEC_ROOT}/**/*.md`);
  } catch {
    return execSync(`find ${SPEC_ROOT} -type f -name '*.md'`).toString().trim().split('\n');
  }
}

const failures = [];
for (const path of listMd()) {
  const txt = readFileSync(path, 'utf8');
  const dir = dirname(path);
  for (const m of txt.matchAll(LINK_RE)) {
    const href = m[1];
    if (/^(https?:|mailto:|mem:\/\/|#)/i.test(href)) continue;
    const target = resolve(dir, href);
    if (!existsSync(target)) {
      failures.push({
        path,
        missing: href,
        resolved: target,
        reason: `Dangling relative link — blind-AI will fail-fast (file does not exist at resolved path).`,
      });
    }
  }
}

if (failures.length === 0) {
  console.log(`[check-dangling-links] OK — every relative link under ${SPEC_ROOT}/ resolves`);
  process.exit(0);
}

console.error(`[check-dangling-links] CODE RED — ${failures.length} dangling link(s):`);
for (const f of failures) {
  console.error(`  - path: ${f.path}`);
  console.error(`    missing: ${f.missing}`);
  console.error(`    resolved: ${f.resolved}`);
  console.error(`    reason: ${f.reason}`);
}
process.exit(1);
