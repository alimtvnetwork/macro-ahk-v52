// CI gate (spec §17 + §41 G15): no built distribution artifacts may be
// committed to the repo. Built ZIPs / CRX / XPI / signed bundles MUST come
// from the release workflow's `package` job (deterministic SHA-256), never
// from a developer's working tree. A committed zip would (a) bypass the
// checksum chain, (b) shadow the workflow output, and (c) silently regress
// to a non-reproducible release.
//
// Root cause this guard addresses: §17 (deterministic packaging) and
// §41.7 G17 (release artifact provenance) were spec-only — nothing in CI
// actually failed the build if a contributor accidentally `git add`-ed a
// `dist/extension.zip` or a vendored `extension-v1.2.3.crx`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const FORBIDDEN_EXT = /\.(zip|crx|xpi)$/i;

// Allow-list: spec/example fixtures that legitimately reference these
// extensions by *name* in markdown or test fixtures are fine — we only
// scan tracked binary files.
const ALLOW_LIST = new Set([
  // intentionally empty — no committed binary archives are allowed
]);

test('no committed .zip / .crx / .xpi distribution artifacts (spec §17 + §41 G15)', () => {
  const out = execFileSync('git', ['ls-files'], { encoding: 'utf8' });
  const offenders = out
    .split('\n')
    .filter(Boolean)
    .filter((p) => FORBIDDEN_EXT.test(p))
    .filter((p) => !ALLOW_LIST.has(p));

  assert.deepEqual(
    offenders,
    [],
    `Committed distribution artifacts detected (forbidden by spec §17 deterministic packaging + §41.7 G17 provenance):\n` +
      offenders.map((p) => `  - ${p}`).join('\n') +
      `\n\nFix: delete the file, add the matching glob to .gitignore, and rebuild via the release workflow.`,
  );
});
