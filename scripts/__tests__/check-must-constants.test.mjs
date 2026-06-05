import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'audit',
  'check-must-constants.mjs',
);

function createFixture() {
  const rootPath = mkdtempSync(join(tmpdir(), 'check-must-constants-'));
  const defaultsPath = join(rootPath, '01-prompt-spec/reference/05-runtime-defaults.md');
  mkdirSync(dirname(defaultsPath), { recursive: true });
  writeFileSync(defaultsPath, '| Constant | Default | Range | Source |\n|---|---:|---|---|\n| `DELAY_MS` | 1500 | 0..600000 | `x.md` |\n');

  return rootPath;
}

function writeSpec(rootPath, relativePath, content) {
  const filePath = join(rootPath, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

function runChecker(rootPath) {
  return spawnSync(process.execPath, [SCRIPT, `--root=${rootPath}`], { encoding: 'utf8' });
}

function runStrictChecker(rootPath) {
  return spawnSync(process.execPath, [SCRIPT, `--root=${rootPath}`, '--strict'], { encoding: 'utf8' });
}

test('passes when numeric constants cite runtime defaults by constant name', () => {
  const rootPath = createFixture();
  try {
    writeSpec(rootPath, '01-prompt-spec/12-delay-engine/01-default.md', 'Delay MUST use `DELAY_MS` (1500 ms) from runtime defaults.\n');
    const result = runChecker(rootPath);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /OK/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('fails when numeric constants are unbound prose', () => {
  const rootPath = createFixture();
  try {
    writeSpec(rootPath, '01-prompt-spec/06-injection-contract/04-paste-verification.md', 'deadline := now + 250 ms\n');
    const result = runChecker(rootPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /CODE RED/);
    assert.match(result.stderr, /reference\/05-runtime-defaults\.md/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('strict mode rejects file-level binding without a line-level constant', () => {
  const rootPath = createFixture();
  try {
    writeSpec(rootPath, '01-prompt-spec/12-delay-engine/01-default.md', 'Defaults cite reference/05-runtime-defaults.md.\nDelay default is 777 ms.\n');
    const result = runStrictChecker(rootPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Delay default is 777 ms/);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});