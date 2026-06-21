#!/usr/bin/env node
/**
 * check-prompt-mirrors.mjs
 *
 * Verifies every canonical prompt listed in .lovable/prompt-mirrors.json has:
 *   1. A mirror file at .lovable/prompts/<XX-slug>.md
 *   2. A matching slug between info.json (canonical) and the mirror filename
 *   3. A registry row in .lovable/prompts.md that references the mirror filename
 *
 * Exits non-zero with a clear report when any expectation fails.
 *
 * Run: node scripts/check-prompt-mirrors.mjs
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MANIFEST = join(ROOT, ".lovable", "prompt-mirrors.json");
const CANON_DIR = join(ROOT, "standalone-scripts", "prompts");
const MIRROR_DIR = join(ROOT, ".lovable", "prompts");
const REGISTRY = join(ROOT, ".lovable", "prompts.md");

const errors = [];

function fail(msg) { errors.push(msg); }

async function main() {
    const manifest = JSON.parse(await readFile(MANIFEST, "utf-8"));
    const registry = await readFile(REGISTRY, "utf-8");

    for (const entry of manifest.mirrors) {
        const { canonical, mirror, slug } = entry;

        const infoPath = join(CANON_DIR, canonical, "info.json");
        if (!existsSync(infoPath)) {
            fail(`[MISSING-CANONICAL] ${canonical}/info.json not found at ${infoPath}`);
            continue;
        }
        const info = JSON.parse(await readFile(infoPath, "utf-8"));
        const canonicalSlug = info.Slug ?? info.slug;
        if (canonicalSlug !== slug) {
            fail(`[SLUG-MISMATCH] ${canonical}/info.json slug "${canonicalSlug}" != manifest "${slug}"`);
        }

        const mirrorPath = join(MIRROR_DIR, mirror);
        if (!existsSync(mirrorPath)) {
            fail(`[MISSING-MIRROR] expected ${mirrorPath} (canonical: ${canonical}, slug: ${slug})`);
            continue;
        }

        // Mirror filename must be NN-<slug>.md
        const match = /^(\d{2})-([a-z0-9-]+)\.md$/.exec(mirror);
        if (!match) {
            fail(`[BAD-MIRROR-NAME] "${mirror}" must match NN-<slug>.md`);
        } else {
            const mirrorSlug = match[2];
            // Allow versioned mirrors (e.g. next-steps-v7) but must start with slug
            if (!mirrorSlug.startsWith(slug.split("-").slice(0, 2).join("-")) && mirrorSlug !== slug) {
                // Soft check — just warn via error if completely unrelated
                if (!mirrorSlug.includes(slug.split("-")[0])) {
                    fail(`[SLUG-FILENAME-DRIFT] mirror "${mirror}" filename slug "${mirrorSlug}" unrelated to canonical slug "${slug}"`);
                }
            }
        }

        if (!registry.includes(mirror)) {
            fail(`[MISSING-REGISTRY-ROW] .lovable/prompts.md has no row referencing "${mirror}"`);
        }
    }

    if (errors.length > 0) {
        console.error(`[FAIL] check-prompt-mirrors: ${errors.length} problem(s):`);
        for (const e of errors) console.error("  " + e);
        process.exit(1);
    }
    console.log(`[OK] check-prompt-mirrors: ${manifest.mirrors.length} mirrors verified.`);
}

main().catch(err => {
    console.error("[FAIL] check-prompt-mirrors crashed:", err);
    process.exit(1);
});
