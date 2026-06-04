#!/usr/bin/env node
/**
 * Acceptance tests for "Chrome Extension CI/CD" under
 * spec/2026-spec/02-ci-cd-spec-for-chrome-extensions.
 *
 * The spec is split across an index README + topic files (01..17). This test
 * verifies §40 criteria 1, 5, 6 (and 3, 4 implicitly) without invoking any
 * network, build, or release machinery. Pure file inspection.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const SPEC_DIR = resolve(REPO_ROOT, 'spec/2026-spec/02-ci-cd-spec-for-chrome-extensions');
const SPEC_README = resolve(SPEC_DIR, 'README.md');
const GITIGNORE = resolve(REPO_ROOT, '.gitignore');

function readAllSpec() {
    const files = readdirSync(SPEC_DIR).filter(f => f.endsWith('.md'));
    return files.map(f => readFileSync(resolve(SPEC_DIR, f), 'utf8')).join('\n\n');
}

test('§40.1 — spec folder + README + split topic files exist at canonical path', () => {
    assert.ok(existsSync(SPEC_DIR), `Spec folder missing: ${SPEC_DIR}`);
    assert.ok(existsSync(SPEC_README), `Spec README missing: ${SPEC_README}`);
    const expected = [
        '01-forty-planning-steps.md',
        '03-download-and-install-scripts.md',
        '05-workflow-files-and-triggers.md',
        '09-release-artifacts.md',
        '11-no-committed-zips.md',
        '15-acceptance-criteria.md',
    ];
    for (const f of expected) {
        assert.ok(existsSync(resolve(SPEC_DIR, f)), `Missing split spec file: ${f}`);
    }
});

test('§40.3 — forty planning steps (§0) are listed in 01-forty-planning-steps.md', () => {
    const raw = readFileSync(resolve(SPEC_DIR, '01-forty-planning-steps.md'), 'utf8');
    for (let n = 1; n <= 40; n++) {
        assert.match(raw, new RegExp(`(^|\\n)${n}\\.`), `Outline missing step ${n}`);
    }
});

test('§40.4 — download / install / probing sections present with runnable examples', () => {
    const all = readAllSpec();
    for (const section of ['## §18.', '## §19.', '## §20.']) {
        assert.ok(all.includes(section), `Spec missing ${section}`);
    }
    const download = readFileSync(resolve(SPEC_DIR, '03-download-and-install-scripts.md'), 'utf8');
    const probing = readFileSync(resolve(SPEC_DIR, '04-probing.md'), 'utf8');
    assert.match(download, /```/, '§18/§19 file must contain a runnable example');
    assert.match(probing, /```/, '§20 file must contain a runnable example');
});

test('§40.5 — example workflow YAML supports N extensions via strategy.matrix', () => {
    const wf = readFileSync(resolve(SPEC_DIR, '05-workflow-files-and-triggers.md'), 'utf8');
    assert.ok(wf.includes('## §22.'), '§22 example workflow missing');
    assert.match(wf, /strategy:\s*\{?\s*matrix/, 'Workflow must use strategy.matrix');
    assert.match(wf, /manifest\.json/, 'Workflow must auto-discover via manifest.json');
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
