#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, '..', 'check-e2e-chrome-verification.mjs');

test('Chrome E2E verification gate passes on committed evidence', () => {
  const result = spawnSync('node', [SCRIPT, '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.checklist.length, 10);
  assert.equal(payload.failures.length, 0);
});

test('Chrome E2E verification gate pins headed extension CI contract', () => {
  const result = spawnSync('node', [SCRIPT, '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const payload = JSON.parse(result.stdout);
  const ciItem = payload.checklist.find((item) => item.id === 'headed-chromium-ci');
  assert.ok(ciItem, 'headed-chromium-ci checklist item must exist');
  assert.equal(ciItem.ok, true);
  assert.ok(ciItem.filesPresent.includes('.github/workflows/ci.yml'));
});
