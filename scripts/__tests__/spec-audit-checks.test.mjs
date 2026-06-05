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
