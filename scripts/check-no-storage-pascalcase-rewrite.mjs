#!/usr/bin/env node
/**
 * check-no-storage-pascalcase-rewrite.mjs
 *
 * CI gate enforcing `mem://constraints/no-storage-pascalcase-migration`.
 *
 * Scans the codebase for any code path that attempts to rename or rewrite
 * `StoredProject` (or sibling) keys in `chrome.storage.local` from camelCase
 * to PascalCase. Phase 2c-storage v2 is permanently forbidden — ~50+ UI /
 * background / options consumers read camelCase keys, and a rewrite would
 * cause data loss + extension boot failure.
 *
 * Flags violations like:
 *   - `chrome.storage.local.set({ SchemaVersion: ... })` (PascalCase key)
 *   - `chrome.storage.local.set({ TargetUrls: ... })`
 *   - `chrome.storage.local.set({ Scripts: ... })`     (when context is StoredProject)
 *   - Renaming helpers: `renameStorageKey`, `migrateStoredProjectKeys`, `pascalCaseStoredProject`
 *   - Object rebuilds copying camelCase StoredProject fields into PascalCase keys
 *
 * Allowed (will NOT flag):
 *   - SQLite PascalCase column names (those are correct — see logging-data-contract)
 *   - Reads from `chrome.storage.local` (only writes are dangerous)
 *   - The guard itself (`src/background/storage-migration.ts`) and its test
 *   - This script and its memory/spec references
 *
 * Exit code 1 on any violation.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_DIRS = ["src", "standalone-scripts"];
const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

// Files explicitly allowed to mention these patterns (guard + tests + docs).
const ALLOW_FILES = new Set([
    "src/background/storage-migration.ts",
    "src/background/__tests__/storage-migration-guard.test.ts",
    "scripts/check-no-storage-pascalcase-rewrite.mjs",
]);

// The PascalCase versions of canonical StoredProject fields. Writing any of
// these as a key into chrome.storage.local is a violation.
const FORBIDDEN_PASCAL_KEYS = [
    "SchemaVersion",
    "TargetUrls",
    "Scripts",
    "Configs",
    "Cookies",
    "Settings",
    "Dependencies",
    "IsGlobal",
    "IsRemovable",
    "CreatedAt",
    "UpdatedAt",
    "CodeName",
    "Slug",
];

// Helper identifiers that signal a rewrite is being attempted.
const FORBIDDEN_IDENTIFIERS = [
    /\brenameStorageKey\b/,
    /\bmigrateStoredProjectKeys\b/,
    /\bpascalCaseStoredProject\b/,
    /\brewriteStorageKeysToPascal\b/,
    /\btoPascalCaseStoredProject\b/,
];

/** Walk dir and yield matching file paths. */
function walk(dir) {
    const out = [];
    let entries;
    try {
        entries = readdirSync(dir);
    } catch {
        return out;
    }
    for (const name of entries) {
        const full = join(dir, name);
        let st;
        try {
            st = statSync(full);
        } catch {
            continue;
        }
        if (st.isDirectory()) {
            if (name === "node_modules" || name === "dist" || name === ".release" || name === "skipped") {
                continue;
            }
            out.push(...walk(full));
        } else if (SCAN_EXT.has(extname(name))) {
            out.push(full);
        }
    }
    return out;
}

function scanFile(absPath) {
    const rel = relative(REPO_ROOT, absPath).replaceAll("\\", "/");
    if (ALLOW_FILES.has(rel)) {
        return [];
    }
    const src = readFileSync(absPath, "utf8");
    const violations = [];

    const usesChromeStorage = /chrome\.storage\.local\.set\b/.test(src);

    if (usesChromeStorage) {
        // Look at each chrome.storage.local.set(...) call and inspect a small
        // window of source after it for any forbidden PascalCase key literal.
        const setRegex = /chrome\.storage\.local\.set\s*\(/g;
        let m;
        while ((m = setRegex.exec(src)) !== null) {
            const start = m.index;
            const window = src.slice(start, start + 800);
            for (const key of FORBIDDEN_PASCAL_KEYS) {
                // Match "Key:" or '"Key":' or "'Key':" or `[Key]:` as object key.
                const keyRe = new RegExp(
                    `(?:^|[\\s,{\\[])(?:["']?)${key}(?:["']?)\\s*:`,
                    "m",
                );
                if (keyRe.test(window)) {
                    const line = src.slice(0, start).split("\n").length;
                    violations.push({
                        file: rel,
                        line,
                        reason: `chrome.storage.local.set() writes forbidden PascalCase key "${key}" (StoredProject must stay camelCase)`,
                    });
                }
            }
        }
    }

    // Identifier-based detection (works regardless of chrome.storage usage).
    for (const re of FORBIDDEN_IDENTIFIERS) {
        const match = re.exec(src);
        if (match) {
            const line = src.slice(0, match.index).split("\n").length;
            violations.push({
                file: rel,
                line,
                reason: `Forbidden storage-rewrite identifier: ${match[0]}`,
            });
        }
    }

    return violations;
}

function main() {
    const files = SCAN_DIRS.flatMap((d) => walk(join(REPO_ROOT, d)));
    const violations = files.flatMap(scanFile);

    if (violations.length === 0) {
        console.log(
            `[check-no-storage-pascalcase-rewrite] OK — scanned ${files.length} files, no violations.`,
        );
        return;
    }

    console.error(
        `\n[check-no-storage-pascalcase-rewrite] FAILED — ${violations.length} violation(s):`,
    );
    console.error(
        `Phase 2c-storage v2 (PascalCase rewrite of StoredProject in chrome.storage.local)`,
    );
    console.error(
        `is permanently forbidden. See mem://constraints/no-storage-pascalcase-migration.\n`,
    );
    for (const v of violations) {
        console.error(`  ${v.file}:${v.line} — ${v.reason}`);
    }
    console.error("");
    process.exit(1);
}

main();
