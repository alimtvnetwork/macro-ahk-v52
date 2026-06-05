import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(TEST_DIR, '..', 'audit', 'audit-scan.py');

function createFixture() {
  const rootPath = mkdtempSync(join(tmpdir(), 'audit-scan-'));
  const folderPath = join(rootPath, 'spec/2026-spec/01-demo');
  mkdirSync(folderPath, { recursive: true });
  writeFileSync(join(folderPath, '01-demo.md'), '# Demo\n\n## Acceptance\n- [ ] Pass.\n');

  return { folderPath, rootPath };
}

test('audit scanner writes JSON to --output path', () => {
  const { folderPath, rootPath } = createFixture();
  const outputPath = join(rootPath, 'scores.json');
  try {
    const result = spawnSync('python3', [SCRIPT, folderPath, `--output=${outputPath}`], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(JSON.parse(readFileSync(outputPath, 'utf8')).length, 1);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test('audit scanner skips generated audit folders', () => {
  const { folderPath, rootPath } = createFixture();
  try {
    const auditPath = join(dirname(folderPath), '_audit-2026-06-05');
    mkdirSync(auditPath, { recursive: true });
    writeFileSync(join(auditPath, '99-generated.md'), '# Generated\n');
    const result = spawnSync('python3', [SCRIPT, dirname(folderPath)], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).length, 1);
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});