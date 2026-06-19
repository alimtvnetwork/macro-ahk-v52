/**
 * ext-smoke-02.ts
 *
 * Stage-2 extension smoke check: asserts that the required source
 * entries the build chain depends on actually exist on disk before
 * Vite is invoked. Catches accidental moves/renames of popup/options
 * HTML or manifest that would otherwise fail later with a noisy
 * Rollup "could not resolve entry" error.
 *
 * Run: bun scripts/ext-smoke-02.ts
 * Exit: 0 on success, 1 on first missing entry (fail-fast, no retry).
 */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve relative to the repo root (scripts/..), NOT process.cwd().
// CI jobs sometimes invoke this from a sub-directory (e.g. chrome-extension/)
// where `src/popup/popup.html` legitimately does not exist — but the source
// entries always live at a fixed offset from this file.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED_ENTRIES: ReadonlyArray<string> = [
    "manifest.json",
    "src/popup/popup.html",
    "src/options/options.html",
];

let failed = false;
for (const rel of REQUIRED_ENTRIES) {
    const abs = resolve(ROOT, rel);
    if (!existsSync(abs)) {
        console.error(`smoke: missing required entry ${rel}`);
        failed = true;
        break; // fail-fast per no-retry policy
    }
}

if (failed) {
    process.exit(1);
}

console.log(`smoke: OK — ${REQUIRED_ENTRIES.length} required entries present`);
