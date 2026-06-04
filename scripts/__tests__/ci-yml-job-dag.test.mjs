#!/usr/bin/env node
/**
 * Doc-vs-workflow regression for the CI job DAG.
 *
 * The reference DAG documented in pipeline/02-ci-workflow.md MUST match
 * the `needs:` edges actually declared in .github/workflows/ci.yml.
 *
 * This pins the dependency graph against silent drift (job renames, missing
 * `needs:` entries, new jobs that bypass the documented chain), which is the
 * §22 / §22a contract from spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/
 * 05-workflow-files-and-triggers.md.
 *
 * Strategy: regex-scan the workflow YAML for top-level jobs (2-space indent,
 * non-comment, name ending with `:`) and their `needs:` declarations. We
 * verify each documented edge exists; we do NOT enforce the full set of jobs
 * are documented (ci.yml has many auxiliary lint/typecheck jobs that don't
 * belong in the high-level pipeline diagram).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const CI_YML = resolve(REPO_ROOT, '.github/workflows/ci.yml');
const CI_DOC = resolve(REPO_ROOT, 'pipeline/02-ci-workflow.md');

/** Documented DAG from pipeline/02-ci-workflow.md. */
const DOCUMENTED_EDGES = [
    ['build-sdk', 'setup'],
    ['build-xpath', 'build-sdk'],
    ['build-macro-controller', 'build-sdk'],
    ['build-prompts', 'setup'],
    ['build-extension', 'build-sdk'],
    ['build-extension', 'build-xpath'],
    ['build-extension', 'build-macro-controller'],
    ['build-extension', 'build-prompts'],
];

function parseJobNeeds(yamlText) {
    /** map<jobName, Set<dep>> */
    const needs = new Map();
    const lines = yamlText.split('\n');
    let inJobs = false;
    let currentJob = null;

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (/^jobs:\s*$/.test(line)) { inJobs = true; continue; }
        if (!inJobs) continue;

        // Top-level job header: exactly 2-space indent + `name:` with nothing after.
        const jobMatch = /^ {2}([a-zA-Z][\w-]*):\s*(#.*)?$/.exec(line);
        if (jobMatch) {
            currentJob = jobMatch[1];
            if (!needs.has(currentJob)) needs.set(currentJob, new Set());
            continue;
        }
        // A new top-level key (no indent) ends jobs section.
        if (/^[a-zA-Z]/.test(line)) { inJobs = false; continue; }

        if (!currentJob) continue;

        // `    needs: foo` or `    needs: [a, b]`
        const inlineList = /^ {4}needs:\s*\[([^\]]+)\]/.exec(line);
        if (inlineList) {
            for (const dep of inlineList[1].split(',')) {
                const clean = dep.trim().replace(/^['"]|['"]$/g, '');
                if (clean) needs.get(currentJob).add(clean);
            }
            continue;
        }
        const scalar = /^ {4}needs:\s+([a-zA-Z][\w-]*)\s*$/.exec(line);
        if (scalar) { needs.get(currentJob).add(scalar[1]); continue; }

        // Multi-line needs block
        if (/^ {4}needs:\s*$/.test(line)) {
            for (let j = i + 1; j < lines.length; j += 1) {
                const item = /^ {6}-\s*([a-zA-Z][\w-]*)\s*$/.exec(lines[j]);
                if (item) { needs.get(currentJob).add(item[1]); continue; }
                break;
            }
        }
    }
    return needs;
}

test('ci.yml job DAG matches documented edges in pipeline/02-ci-workflow.md', () => {
    const yaml = readFileSync(CI_YML, 'utf8');
    const doc = readFileSync(CI_DOC, 'utf8');
    const needs = parseJobNeeds(yaml);

    for (const [job, dep] of DOCUMENTED_EDGES) {
        assert.ok(needs.has(job), `ci.yml is missing documented job \`${job}\``);
        assert.ok(
            needs.get(job).has(dep),
            `ci.yml job \`${job}\` is missing documented \`needs: ${dep}\` edge`,
        );
        // The same edge must be mentioned in the doc (sanity check).
        assert.ok(
            doc.includes(job) && doc.includes(dep),
            `pipeline/02-ci-workflow.md is missing reference to \`${job}\` or \`${dep}\``,
        );
    }
});

test('ci.yml declares the four canonical build jobs from the documented DAG', () => {
    const needs = parseJobNeeds(readFileSync(CI_YML, 'utf8'));
    for (const job of ['setup', 'build-sdk', 'build-xpath', 'build-macro-controller', 'build-prompts', 'build-extension']) {
        assert.ok(needs.has(job), `ci.yml missing top-level job \`${job}\``);
    }
});
