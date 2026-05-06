#!/usr/bin/env node
/**
 * check-changelog-entry.mjs
 *
 * Verifies that `changelog.md` contains an entry for the current
 * `EXTENSION_VERSION` declared in `src/shared/constants.ts`.
 *
 * An "entry" is any heading line of the form:
 *   ## [v2.231.0] — YYYY-MM-DD     (canonical project format)
 *   ## [2.231.0] ...
 *   ## v2.231.0 ...
 *   ## 2.231.0 ...
 *
 * Exits 1 (CI failure) when:
 *   - the version cannot be parsed from constants.ts
 *   - changelog.md is missing
 *   - no heading mentions the current version
 *
 * Why: a version bump without a changelog entry leaves users
 * unable to discover what changed between releases.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONSTANTS = resolve(ROOT, "src/shared/constants.ts");
const CHANGELOG = resolve(ROOT, "changelog.md");

function fail(msg) {
    console.error(`❌ ${msg}`);
    process.exit(1);
}

if (!existsSync(CONSTANTS)) fail(`Missing required file: ${CONSTANTS}`);
if (!existsSync(CHANGELOG)) fail(`Missing required file: ${CHANGELOG}`);

const constantsTxt = readFileSync(CONSTANTS, "utf-8");
const versionMatch = constantsTxt.match(/EXTENSION_VERSION\s*=\s*"(\d+\.\d+\.\d+)"/);
if (!versionMatch) {
    fail(
        `Could not parse EXTENSION_VERSION from ${CONSTANTS}. ` +
        `Expected pattern: EXTENSION_VERSION = "X.Y.Z"`
    );
}
const version = versionMatch[1];

const changelogTxt = readFileSync(CHANGELOG, "utf-8");

// Match a markdown heading (## ...) that contains the version,
// optionally prefixed by `v` and optionally wrapped in [].
// Examples that match:
//   ## [v2.231.0] — 2026-05-06
//   ## [2.231.0] - 2026-05-06
//   ## v2.231.0
//   ## 2.231.0 (2026-05-06)
const escaped = version.replace(/\./g, "\\.");
const headingRe = new RegExp(
    `^#{1,6}\\s+\\[?v?${escaped}\\]?(?:\\s|$|[—\\-(\\]])`,
    "m"
);

if (!headingRe.test(changelogTxt)) {
    console.error("❌ Changelog entry missing for current version.");
    console.error(`   EXTENSION_VERSION = "${version}" (from src/shared/constants.ts)`);
    console.error(`   Expected a heading in changelog.md mentioning v${version}, e.g.:`);
    console.error(`     ## [v${version}] — YYYY-MM-DD`);
    console.error("");
    console.error("   Add a changelog entry before merging the version bump.");
    process.exit(1);
}

console.log(`✅ Changelog entry found for v${version}.`);
process.exit(0);