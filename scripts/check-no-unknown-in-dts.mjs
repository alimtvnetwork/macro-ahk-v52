#!/usr/bin/env node
/**
 * check-no-unknown-in-dts.mjs
 * ─────────────────────────────────────────────────────────────────
 * Enforces the "No Explicit Unknown" core policy on `.d.ts` files.
 *
 * Why a dedicated scanner (vs eslint):
 *   - ESLint's TS AST selectors can't easily express "ban TSUnknownKeyword
 *     EXCEPT inside `type CaughtError = unknown;`" without a custom plugin.
 *   - `.d.ts` files were historically excluded from the no-unknown
 *     enforcement lane; this scanner pulls them under the same policy
 *     with a single-file allow-list for the canonical CaughtError leaf.
 *
 * Policy (per Core memory):
 *   - `unknown` is permitted ONLY in the CaughtError type alias.
 *   - Every other `.d.ts` `unknown` is debt and must be migrated to a
 *     designed type.
 *
 * Two enforcement tiers:
 *   1. HARD_PINNED — must contain zero `unknown` outside CaughtError.
 *      A violation here exits 1 (CI red).
 *   2. BASELINE — pre-existing files with known debt. Each file's
 *      current `unknown` count is recorded; the scanner fails ONLY if
 *      a baseline file's count goes UP (regression guard).
 *
 * Sequential fail-fast (Core no-retry policy).
 *
 * USAGE
 *   node scripts/check-no-unknown-in-dts.mjs
 *   node scripts/check-no-unknown-in-dts.mjs --update-baseline
 *
 * EXIT CODES
 *   0  no violations
 *   1  a hard-pinned file uses `unknown` (outside CaughtError), OR a
 *      baseline file's `unknown` count increased
 *
 * Author: Riseup Asia LLC
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const BASELINE_PATH = path.join(SCRIPT_DIR, "check-no-unknown-in-dts.baseline.json");

/**
 * HARD_PINNED — `.d.ts` files that MUST stay clean. Zero `unknown`
 * tokens outside the `type CaughtError = unknown;` allow-leaf.
 */
const HARD_PINNED = [
    "standalone-scripts/types/riseup-namespace.d.ts",
];

/**
 * SCAN_GLOB — directories whose `.d.ts` files are tracked. Anything
 * outside these roots is ignored (e.g. node_modules, dist, skipped).
 */
const SCAN_ROOTS = [
    "standalone-scripts",
    "src",
    "chrome-extension",
];

const SKIP_DIRS = new Set(["node_modules", "dist", ".release", "skipped", "build"]);

function* walk(dir) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            yield* walk(path.join(dir, entry.name));
        } else if (entry.isFile() && entry.name.endsWith(".d.ts")) {
            yield path.join(dir, entry.name);
        }
    }
}

/**
 * Strip line and block comments — the policy only cares about code
 * tokens, not prose mentions of "unknown" in JSDoc.
 */
function stripComments(src) {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");
}

/**
 * Count `unknown` occurrences as a standalone identifier, excluding
 * the one sanctioned `type CaughtError = unknown;` declaration.
 * Exported for unit tests.
 */
export function countUnknown(src) {
    const code = stripComments(src);
    const withoutCaught = code.replace(
        /\btype\s+CaughtError\s*=\s*unknown\s*;/g,
        "",
    );
    const matches = withoutCaught.match(/\bunknown\b/g);
    return matches ? matches.length : 0;
}

function readBaseline() {
    if (!fs.existsSync(BASELINE_PATH)) return {};
    try {
        return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
    } catch {
        return {};
    }
}

function writeBaseline(map) {
    const sorted = Object.fromEntries(
        Object.entries(map).sort(([a], [b]) => a.localeCompare(b)),
    );
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(sorted, null, 2) + "\n");
}

function main() {
    const updateMode = process.argv.includes("--update-baseline");

    const allFiles = [];
    for (const root of SCAN_ROOTS) {
        const abs = path.join(REPO_ROOT, root);
        if (!fs.existsSync(abs)) continue;
        allFiles.push(...walk(abs));
    }

    const counts = {};
    for (const abs of allFiles) {
        const rel = path.relative(REPO_ROOT, abs).replace(/\\/g, "/");
        const src = fs.readFileSync(abs, "utf8");
        counts[rel] = countUnknown(src);
    }

    if (updateMode) {
        writeBaseline(counts);
        console.log(`Baseline updated: ${Object.keys(counts).length} .d.ts files tracked.`);
        process.exit(0);
    }

    const baseline = readBaseline();
    const failures = [];

    // 1. Hard-pinned check
    for (const pinned of HARD_PINNED) {
        const abs = path.join(REPO_ROOT, pinned);
        if (!fs.existsSync(abs)) {
            failures.push({
                file: pinned,
                reason: `CODE RED: hard-pinned file missing on disk at ${abs}. Reason: HARD_PINNED list references a file that no longer exists. Action: remove from HARD_PINNED or restore the file.`,
            });
            continue;
        }
        const count = counts[pinned] ?? 0;
        if (count > 0) {
            failures.push({
                file: pinned,
                reason: `Hard-pinned file contains ${count} \`unknown\` token(s) outside CaughtError. Policy: zero tolerance.`,
            });
        }
    }

    // 2. Baseline regression check
    for (const [rel, count] of Object.entries(counts)) {
        const baselineCount = baseline[rel];
        if (baselineCount === undefined) {
            // New file — must be clean
            if (count > 0) {
                failures.push({
                    file: rel,
                    reason: `New .d.ts file uses \`unknown\` ${count} time(s). New code MUST use designed types. Run with --update-baseline only if intentional.`,
                });
            }
            continue;
        }
        if (count > baselineCount) {
            failures.push({
                file: rel,
                reason: `Regression: \`unknown\` count rose from ${baselineCount} to ${count}. Reduce or run --update-baseline only if intentional.`,
            });
        }
    }

    if (failures.length === 0) {
        const tracked = Object.values(counts).reduce((a, b) => a + b, 0);
        console.log(`OK — no-unknown-in-dts: ${Object.keys(counts).length} .d.ts files scanned, ${tracked} legacy \`unknown\` token(s) within baseline.`);
        process.exit(0);
    }

    console.error("✘ check-no-unknown-in-dts FAILED:\n");
    for (const f of failures) {
        console.error(`  ${f.file}`);
        console.error(`    ${f.reason}\n`);
    }
    process.exit(1);
}

main();
