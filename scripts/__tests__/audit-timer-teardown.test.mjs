import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

test('audit-timer-teardown.mjs runs and emits JSON', () => {
  execSync('node scripts/audit-timer-teardown.mjs', { stdio: 'pipe' });
  assert.ok(existsSync('public/timer-teardown-audit.json'));
  const j = JSON.parse(readFileSync('public/timer-teardown-audit.json', 'utf8'));
  assert.ok(typeof j.totalFindings === 'number');
  assert.ok(Array.isArray(j.findings));
});
