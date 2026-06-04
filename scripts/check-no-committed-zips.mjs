#!/usr/bin/env node
/**
 * check-no-committed-zips.mjs
 *
 * Enforces spec/12-cicd-pipeline-workflows/02-chrome-extension-ci-cd §26:
 * no extension binary artifacts may be tracked
 * in git. Fails fast (exit 1) listing every offending path.
 *
 * Scope: tracked files only (uses `git ls-files`). Ignored files are fine.
 * Forbidden extensions: .zip .crx .xpi
 *
 * Allowlist: paths under `tests/` fixtures and `skipped/` archives.
 */
import { execSync } from 'node:child_process';

const FORBIDDEN = /\.(zip|crx|xpi)$/i;
const ALLOW_PREFIXES = ['tests/', 'skipped/', '.release/'];

let tracked = '';
try {
  tracked = execSync('git ls-files', { encoding: 'utf8' });
} catch (err) {
  console.error('[check-no-committed-zips] git ls-files failed:', err.message);
  process.exit(2);
}

const offenders = tracked
  .split('\n')
  .filter((p) => p && FORBIDDEN.test(p))
  .filter((p) => !ALLOW_PREFIXES.some((pre) => p.startsWith(pre)));

if (offenders.length > 0) {
  console.error('❌ Committed binary artifacts detected (spec/12-cicd-pipeline-workflows/02-chrome-extension-ci-cd §26):');
  for (const p of offenders) console.error('   - ' + p);
  console.error(
    '\nFix: `git rm --cached <path>` and add the pattern to .gitignore.'
  );
  process.exit(1);
}

console.log('✅ No committed *.zip / *.crx / *.xpi artifacts.');
