#!/usr/bin/env node
/**
 * Doc-vs-workflow regression: the "Companion Workflows" table in
 * pipeline/03-release-workflow.md MUST list every workflow file that ships in
 * .github/workflows/ (excluding ci.yml + release.yml, which are documented in
 * their own dedicated docs).
 *
 * This pins the documented release DAG so silent additions/removals fail CI.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const WF_DIR = resolve(REPO_ROOT, '.github/workflows');
const RELEASE_DOC = resolve(REPO_ROOT, 'pipeline/03-release-workflow.md');

const PRIMARY = new Set(['ci.yml', 'release.yml']);

test('pipeline/03-release-workflow.md Companion Workflows table covers every companion .yml', () => {
    const doc = readFileSync(RELEASE_DOC, 'utf8');
    const idx = doc.indexOf('## Companion Workflows');
    assert.ok(idx >= 0, 'Companion Workflows section missing in pipeline/03-release-workflow.md');
    const section = doc.slice(idx);

    const companions = readdirSync(WF_DIR)
        .filter(f => f.endsWith('.yml') && !PRIMARY.has(f));
    assert.ok(companions.length > 0, 'No companion workflow files found in .github/workflows/');

    for (const wf of companions) {
        assert.ok(
            section.includes(`\`${wf}\``),
            `Companion Workflows table is missing \`${wf}\` — update pipeline/03-release-workflow.md`,
        );
    }
});
