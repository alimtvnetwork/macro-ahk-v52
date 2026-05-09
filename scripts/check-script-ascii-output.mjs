#!/usr/bin/env node
/**
 * CI guard: build/CI scripts must not emit non-ASCII characters
 * (✅ ❌ → ✓ ✗ ═ ─ • etc.) because they render as mojibake under
 * Windows PowerShell's default cp1252/cp437 console encoding.
 *
 * Scans every `console.log` / `console.error` / `console.warn` /
 * `process.stdout.write` / `process.stderr.write` string argument
 * inside `scripts/*.mjs` and fails on any code point > 0x7E.
 *
 * Em-dashes inside JSDoc/line comments are tolerated.
 */
import { readFileSync } from "node:fs";

/**
 * Scoped allowlist: scripts that run during the standalone build chain
 * invoked by `pnpm run build:<project>`. These print directly to the
 * Windows PowerShell console where non-ASCII = mojibake.
 */
const FILES = [
    "scripts/aggregate-prompts.mjs",
    "scripts/cached-build.mjs",
    "scripts/check-axios-version.mjs",
    "scripts/check-instruction-json-casing.mjs",
    "scripts/check-no-nested-pnpm-run.mjs",
    "scripts/check-script-ascii-output.mjs",
    "scripts/check-standalone-build-portability.mjs",
    "scripts/compile-instruction.mjs",
    "scripts/run-standalone-build-step.mjs",
    "scripts/validate-instruction-schema.mjs",
];

const FORBIDDEN_RE = /[^\x00-\x7E]/g;
const CALL_RE =
    /(?:console\.(?:log|error|warn|info)|process\.(?:stdout|stderr)\.write)\s*\(([\s\S]*?)\)\s*;/g;

const failures = [];
for (const file of FILES) {
    const text = readFileSync(file, "utf-8");
    // Strip line + block comments before scanning.
    const stripped = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
    let m;
    while ((m = CALL_RE.exec(stripped)) !== null) {
        const args = m[1];
        const bad = args.match(FORBIDDEN_RE);
        if (bad && bad.length > 0) {
            const lineNo = stripped.slice(0, m.index).split("\n").length;
            const unique = Array.from(new Set(bad)).join(" ");
            failures.push({ file, line: lineNo, chars: unique });
        }
    }
}

if (failures.length > 0) {
    console.error(
        "[FAIL] Non-ASCII characters detected in script console output."
    );
    console.error(
        "Reason: they render as mojibake under Windows PowerShell."
    );
    console.error("Replace with ASCII equivalents: [OK] [FAIL] -> | + - =");
    console.error("");
    for (const f of failures) {
        console.error(`  ${f.file}:${f.line}  bad chars: ${f.chars}`);
    }
    process.exit(1);
}

console.log(
    "[OK] Standalone build-chain scripts emit ASCII-safe output " +
        "(scanned " + FILES.length + " files)"
);