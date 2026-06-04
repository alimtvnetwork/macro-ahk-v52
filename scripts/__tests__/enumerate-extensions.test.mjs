#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const SCRIPT = resolve('scripts/enumerate-extensions.mjs');

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2));
}

test('enumerates only Manifest V3 extension directories as JSON', () => {
  const root = mkdtempSync(join(tmpdir(), 'enumerate-extensions-'));
  mkdirSync(join(root, 'alpha'), { recursive: true });
  mkdirSync(join(root, 'beta'), { recursive: true });
  mkdirSync(join(root, 'node_modules', 'ignored'), { recursive: true });
  writeJson(join(root, 'alpha', 'manifest.json'), { manifest_version: 3, name: 'Alpha', version: '1.0.0' });
  writeJson(join(root, 'beta', 'manifest.json'), { manifest_version: 2, name: 'Beta', version: '1.0.0' });
  writeJson(join(root, 'node_modules', 'ignored', 'manifest.json'), { manifest_version: 3, name: 'Ignored', version: '1.0.0' });

  const output = execFileSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), ['alpha']);
});

test('prints one path per line for shell workflows', () => {
  const root = mkdtempSync(join(tmpdir(), 'enumerate-extensions-lines-'));
  mkdirSync(join(root, 'zeta'), { recursive: true });
  writeJson(join(root, 'manifest.json'), { manifest_version: 3, name: 'Root', version: '1.0.0' });
  writeJson(join(root, 'zeta', 'manifest.json'), { manifest_version: 3, name: 'Zeta', version: '1.0.0' });

  const output = execFileSync(process.execPath, [SCRIPT, '--root', root, '--lines'], { encoding: 'utf8' });
  assert.equal(output, '.\nzeta\n');
});
