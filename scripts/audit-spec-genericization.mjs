#!/usr/bin/env node
/**
 * Spec genericization guard.
 *
 * The abstract / cross-project spec (everything under spec/ EXCEPT
 * app-specific directories) must use the `<NAMESPACE>` placeholder
 * rather than the project-specific runtime identifier.
 *
 * App-specific directories document this exact app's runtime and are
 * allowed to use the real identifier:
 *   - spec/21-app/**, spec/22-app-issues/**, spec/2026-spec/**
 *   - spec/31-macro-recorder/**, spec/audit/**, spec/99-archive/**
 *   - spec/00-glossary.md (canonical mapping)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SPEC = join(ROOT, 'spec');
const RAW_TOKEN = 'RiseupAsiaMacroExt';

const APP_SPECIFIC = [
    /^spec[\\/]21-app[\\/]/,
    /^spec[\\/]22-app-issues[\\/]/,
    /^spec[\\/]2026-spec[\\/]/,
    /^spec[\\/]31-macro-recorder[\\/]/,
    /^spec[\\/]audit[\\/]/,
    /^spec[\\/]99-archive[\\/]/,
    /^spec[\\/]00-glossary\.md$/,
];

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        const s = statSync(p);
        if (s.isDirectory()) walk(p, out);
        else if (/\.(md|mdx)$/.test(name)) out.push(p);
    }
    return out;
}

const violations = [];
for (const file of walk(SPEC)) {
    const rel = relative(ROOT, file);
    if (APP_SPECIFIC.some((rx) => rx.test(rel))) continue;
    const src = readFileSync(file, 'utf8');
    if (src.includes(RAW_TOKEN)) {
        violations.push(rel);
    }
}

if (violations.length > 0) {
    console.error(`spec-genericization: FAIL — ${violations.length} abstract-spec file(s) contain raw '${RAW_TOKEN}'.`);
    for (const v of violations) console.error(`  ${v}`);
    process.exit(1);
}

console.log(`spec-genericization: PASS — abstract spec is 100% generic.`);
