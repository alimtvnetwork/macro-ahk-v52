import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ACCEPTANCE_SCRIPT = resolve(TEST_DIR, '..', 'audit', 'check-acceptance.mjs');
const LINKS_SCRIPT = resolve(TEST_DIR, '..', 'audit', 'check-dangling-links.mjs');
const CONSTANT_DIVERGENCE_SCRIPT = resolve(TEST_DIR, '..', 'audit', 'check-constant-divergence.mjs');
const PITFALLS_SCRIPT = resolve(TEST_DIR, '..', 'audit', 'check-pitfalls.mjs');
const MEMORY_REFS_SCRIPT = resolve(TEST_DIR, '..', 'audit', 'check-must-memory-refs.mjs');
const SCORE_FLOOR_SCRIPT = resolve(TEST_DIR, '..', 'audit', 'check-score-floor.mjs');

function createRoot() {
  return mkdtempSync(join(tmpdir(), 'spec-audit-checks-'));
}

function writeFixture(rootPath, relativePath, content) {
  const filePath = join(rootPath, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

function runScript(scriptPath, rootPath) {
  return spawnSync(process.execPath, [scriptPath, `--root=${rootPath}`], { encoding: 'utf8' });
}

function writeRuntimeDefaults(rootPath) {
  writeFixture(rootPath, '01-prompt-spec/reference/05-runtime-defaults.md', '# Runtime Defaults\n\n| Constant | Default | Range | Source |\n|---|---:|---|---|\n| `DELAY_MS` | 7000 | 5000..10000 | `delay.md` |\n| `MAX_SCRIPT_SIZE_BYTES` | 5242880 | fixed | `quota.md` |\n');
}

test('acceptance checker passes with heading and checkbox bullet', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/01-good.md', '# Good\n\n## Acceptance\n- [ ] Machine-checkable rule.\n');
    const result = runScript(ACCEPTANCE_SCRIPT, rootPath);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('acceptance checker fails without checkbox bullet', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/01-bad.md', '# Bad\n\n## Acceptance\nPlain prose only.\n');
    const result = runScript(ACCEPTANCE_SCRIPT, rootPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /machine-checkable bullet/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('acceptance checker ignores checkbox bullets outside acceptance section', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/01-stray.md', '# Stray\n\n- [ ] Intro checkbox.\n\n## Acceptance\nPlain prose only.\n');
    const result = runScript(ACCEPTANCE_SCRIPT, rootPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /machine-checkable bullet/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('dangling-link checker passes when relative markdown link resolves', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/target.md', '# Target\n');
    writeFixture(rootPath, '01-demo/source.md', '[Target](./target.md)\n');
    const result = runScript(LINKS_SCRIPT, rootPath);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('dangling-link checker fails when relative markdown link is missing', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/source.md', '[Missing](./missing.md)\n');
    const result = runScript(LINKS_SCRIPT, rootPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /CODE RED/);
    assert.match(result.stderr, /missing\.md/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('dangling-link checker validates reference-style markdown links', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/target.md', '# Target\n');
    writeFixture(rootPath, '01-demo/source.md', '[Target][owner]\n\n[owner]: ./target.md\n');
    const result = runScript(LINKS_SCRIPT, rootPath);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('dangling-link checker fails when reference-style target is missing', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/source.md', '[Missing][owner]\n\n[owner]: ./missing.md\n');
    const result = runScript(LINKS_SCRIPT, rootPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Dangling reference-style link/);
    assert.match(result.stderr, /missing\.md/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('dangling-link checker fails when reference definition is absent', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/source.md', '[Missing][owner]\n');
    const result = runScript(LINKS_SCRIPT, rootPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Undefined reference-style link/);
    assert.match(result.stderr, /\[owner]/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('constant-divergence checker passes when values match runtime defaults', () => {
  const rootPath = createRoot();
  try {
    writeRuntimeDefaults(rootPath);
    writeFixture(rootPath, '01-demo/good.md', '# Good\n\n`DELAY_MS = 7000 ms` and `MAX_SCRIPT_SIZE_BYTES = 5 MiB`.\n');
    const result = runScript(CONSTANT_DIVERGENCE_SCRIPT, rootPath);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('constant-divergence checker fails when prose contradicts runtime defaults', () => {
  const rootPath = createRoot();
  try {
    writeRuntimeDefaults(rootPath);
    writeFixture(rootPath, '01-demo/bad.md', '# Bad\n\n`DELAY_MS = 5000 ms` is the default.\n');
    const result = runScript(CONSTANT_DIVERGENCE_SCRIPT, rootPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /DELAY_MS=7000/);
    assert.match(result.stderr, /documented as 5000/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('pitfalls checker passes when file has Pitfall block', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/01-good.md', '# Good\n\n## Pitfalls\n- Anti-pattern: foo.\n');
    const result = runScript(PITFALLS_SCRIPT, rootPath);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('pitfalls checker fails when no pitfall keyword present', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/01-bad.md', '# Bad\n\nNo warnings here.\n');
    const result = runScript(PITFALLS_SCRIPT, rootPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing pitfalls/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('memory-refs checker passes when MUST file cites a mem:// owner', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/01-good.md', '# Good\n\nThe loader MUST cache results.\n\n> Owner: see [docs](mem://standards/loader).\n');
    const result = runScript(MEMORY_REFS_SCRIPT, rootPath);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('memory-refs checker fails when MUST file lacks a mem:// owner', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/01-bad.md', '# Bad\n\nThe loader MUST cache results.\n');
    const result = runScript(MEMORY_REFS_SCRIPT, rootPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /mem:\/\/ owner reference/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('memory-refs checker ignores MUST words inside code fences', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/01-fenced.md', '# Fenced\n\n```\nlog: MUST retry\n```\n');
    const result = runScript(MEMORY_REFS_SCRIPT, rootPath);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('score-floor checker passes when file and composite meet custom floors', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/01-good.md', '# Good\n\nThe loader MUST cache results. The runner MUST cite owners. The report MUST stay reproducible. This fixture includes enough operational prose for a blind AI to understand the contract without guessing. The file repeats domain context deliberately: source specs describe actors, states, owner links, audit gates, and validation outcomes. Implementers can map each rule to a deterministic check, compare expected output, and reject drift before merge. The fixture also names source-of-truth ownership through mem:// and runtime defaults so deterministic prose is rewarded without invented numbers. Reviewers can verify the path, missing item, reason, and score floor from the checker output. Additional words keep the clarity metric above the full-credit threshold while remaining readable and scoped.\n\n## Details\n\nRules are explicit, local, and owned by mem://standards/loader.\n\n## Acceptance\n- [ ] Pass.\n\n## Pitfalls\n- Pitfall: drift.\n\n> Owner: mem://standards/loader\n');
    const result = spawnSync(process.execPath, [SCORE_FLOOR_SCRIPT, `--root=${rootPath}`, '--min-file=90', '--min-composite=90'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('score-floor checker fails with CODE RED path details below floor', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/01-thin.md', '# Thin\n');
    const result = spawnSync(process.execPath, [SCORE_FLOOR_SCRIPT, `--root=${rootPath}`, '--min-file=100', '--min-composite=99.5'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /CODE RED/);
    assert.match(result.stderr, /score >= 100/);
    assert.match(result.stderr, /composite score >= 99\.5/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

const QUARANTINE_SCRIPT = resolve(TEST_DIR, '..', 'audit', 'check-quarantine.mjs');

test('quarantine checker passes when README is the only file', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, 'README.md', '# Quarantine policy\n');
    const result = runScript(QUARANTINE_SCRIPT, rootPath);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('quarantine checker passes when draft declares Graduation Plan', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, 'README.md', '# Policy\n');
    writeFixture(rootPath, '01-draft.md', '# Draft\n\n## Graduation Plan\n- target: foo\n');
    const result = runScript(QUARANTINE_SCRIPT, rootPath);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('quarantine checker fails when draft lacks Graduation Plan', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, 'README.md', '# Policy\n');
    writeFixture(rootPath, '01-orphan.md', '# Orphan\n\nNo plan here.\n');
    const result = runScript(QUARANTINE_SCRIPT, rootPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Graduation Plan/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

const SNAPSHOT_SCRIPT = resolve(TEST_DIR, '..', 'audit', 'check-score-snapshot.mjs');

test('score-snapshot checker fails when snapshot file is missing', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/01-good.md', '# Good\n');
    const snapshotPath = join(rootPath, 'missing.snapshot.json');
    const result = spawnSync(process.execPath, [SNAPSHOT_SCRIPT, `--root=${rootPath}`, `--snapshot=${snapshotPath}`], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /snapshot lock missing/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('score-snapshot checker --update seeds the lock and passes on rerun', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/01-good.md', '# Good\n');
    const snapshotPath = join(rootPath, 'scores.snapshot.json');
    const seed = spawnSync(process.execPath, [SNAPSHOT_SCRIPT, `--root=${rootPath}`, `--snapshot=${snapshotPath}`, '--update'], { encoding: 'utf8' });
    assert.equal(seed.status, 0, seed.stderr);
    const rerun = spawnSync(process.execPath, [SNAPSHOT_SCRIPT, `--root=${rootPath}`, `--snapshot=${snapshotPath}`], { encoding: 'utf8' });
    assert.equal(rerun.status, 0, rerun.stderr);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('score-snapshot checker fails when a tracked file is deleted', () => {
  const rootPath = createRoot();
  try {
    writeFixture(rootPath, '01-demo/01-good.md', '# Good\n');
    const snapshotPath = join(rootPath, 'scores.snapshot.json');
    spawnSync(process.execPath, [SNAPSHOT_SCRIPT, `--root=${rootPath}`, `--snapshot=${snapshotPath}`, '--update'], { encoding: 'utf8' });
    rmSync(join(rootPath, '01-demo/01-good.md'));
    writeFixture(rootPath, '01-demo/02-other.md', '# Other\n');
    const result = spawnSync(process.execPath, [SNAPSHOT_SCRIPT, `--root=${rootPath}`, `--snapshot=${snapshotPath}`], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /removed or renamed/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});
