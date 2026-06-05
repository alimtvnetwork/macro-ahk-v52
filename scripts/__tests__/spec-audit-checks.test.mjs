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