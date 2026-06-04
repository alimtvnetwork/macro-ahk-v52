#!/usr/bin/env node
/**
 * Acceptance tests for "CI/CD Spec For Chrome Extensions" (spec/2026-spec/02).
 *
 * Verifies §40 criteria 1, 5, 6 (and 3, 4 implicitly) from the spec README
 * without invoking any network, build, or release machinery. Pure file
 * inspection — runs in a bare Node environment.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const SPEC_DIR = resolve(REPO_ROOT, 'spec/2026-spec/02-ci-cd-spec-for-chrome-extensions');
const SPEC_README = resolve(SPEC_DIR, 'README.md');
const GITIGNORE = resolve(REPO_ROOT, '.gitignore');

function readSpec() {
    if (!existsSync(SPEC_README)) {
        throw new Error(`Spec README missing at ${SPEC_README}`);
    }
    return readFileSync(SPEC_README, 'utf8');
}

test('§40.1 — spec folder + README exist at the canonical path', () => {
    assert.ok(existsSync(SPEC_DIR), `Spec folder missing: ${SPEC_DIR}`);
    assert.ok(existsSync(SPEC_README), `Spec README missing: ${SPEC_README}`);
});

test('§40.3 — forty planning steps (§0) are listed before detailed sections', () => {
    const raw = readSpec();
    const zeroIdx = raw.indexOf('## §0.');
    const oneIdx = raw.indexOf('## §1.');
    assert.ok(zeroIdx > -1 && oneIdx > zeroIdx, '§0 must precede §1');
    // Every step number 1..40 should appear in §0 outline.
    const outline = raw.slice(zeroIdx, oneIdx);
    for (let n = 1; n <= 40; n++) {
        assert.match(outline, new RegExp(`(^|\\n)${n}\\.`), `Outline missing step ${n}`);
    }
});

test('§40.4 — download / install / probing sections present with runnable examples', () => {
    const raw = readSpec();
    for (const section of ['## §18.', '## §19.', '## §20.']) {
        assert.ok(raw.includes(section), `Spec missing ${section}`);
    }
    // Each example section should contain at least one fenced code block.
    const after18 = raw.slice(raw.indexOf('## §18.'), raw.indexOf('## §19.'));
    const after19 = raw.slice(raw.indexOf('## §19.'), raw.indexOf('## §20.'));
    const after20 = raw.slice(raw.indexOf('## §20.'), raw.indexOf('## §21.'));
    for (const [label, body] of [['§18', after18], ['§19', after19], ['§20', after20]]) {
        assert.match(body, /```/, `${label} must contain a runnable example`);
    }
});

test('§40.5 — example workflow YAML supports N extensions via strategy.matrix', () => {
    const raw = readSpec();
    const wfStart = raw.indexOf('## §22.');
    assert.ok(wfStart > -1, '§22 example workflow missing');
    const wfBody = raw.slice(wfStart, raw.indexOf('## §23.') + 4000);
    assert.match(wfBody, /strategy:\s*\{?\s*matrix/, 'Workflow must use strategy.matrix');
    assert.match(wfBody, /manifest\.json/, 'Workflow must auto-discover via manifest.json');
});

test('§40.6 — no-committed-ZIP rule enforced in .gitignore', () => {
    const ignored = readFileSync(GITIGNORE, 'utf8');
    const lines = ignored.split(/\r?\n/).map(l => l.trim());
    for (const pat of ['*.zip', '*.crx', '*.xpi']) {
        assert.ok(lines.includes(pat), `.gitignore must include "${pat}" to enforce §26/§27`);
    }
    assert.ok(
        lines.includes('release-assets') || lines.includes('release-assets/'),
        '.gitignore must ignore release-assets build output (§27)',
    );
});

test('generic helper scripts referenced by the spec exist', () => {
    for (const rel of [
        'scripts/download-extension.sh',
        'scripts/probe-siblings.sh',
        'scripts/enumerate-extensions.mjs',
        'scripts/check-no-committed-zips.mjs',
    ]) {
        assert.ok(existsSync(resolve(REPO_ROOT, rel)), `Missing helper script: ${rel}`);
    }
});
