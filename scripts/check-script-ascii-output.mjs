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
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SCRIPTS_DIR = "scripts";
const FORBIDDEN_RE = /[^\x00-\x7E]/g;
const CALL_RE =
    /(?:console\.(?:log|error|warn|info)|process\.(?:stdout|stderr)\.write)\s*\(([\s\S]*?)\)\s*;/g;

function listMjs(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) continue;
        if (entry.endsWith(".mjs")) out.push(full);
    }
    return out;
}

const failures = [];
for (const file of listMjs(SCRIPTS_DIR)) {
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
        "Reason: they render as mojibake (Γ£à, ΓåÆ, ΓòÉ) under Windows PowerShell."
    );
    console.error("Replace with ASCII equivalents: [OK] [FAIL] -> | + - =");
    console.error("");
    for (const f of failures) {
        console.error(`  ${f.file}:${f.line}  bad chars: ${f.chars}`);
    }
    process.exit(1);
}

console.log(
    `[OK] All script console output is ASCII-safe (scanned ${listMjs(SCRIPTS_DIR).length} files)`
);