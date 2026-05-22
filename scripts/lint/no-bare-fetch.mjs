#!/usr/bin/env node
/**
 * no-bare-fetch.mjs
 *
 * Lint guard: ensures no NEW bare `fetch(...)` call is introduced without
 * either (a) routing through `httpFailFast()` / `httpFetchOrThrow()`, or
 * (b) an immediate `.ok` check on the next non-comment line, or
 * (c) being in an explicitly whitelisted file/pattern.
 *
 * Run via: node scripts/lint/no-bare-fetch.mjs
 * Wired into: prebuild-clean-and-verify.mjs
 *
 * Exit 0 = clean. Exit 1 = violation(s) found.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../..");
const EXT_ALLOWLIST = new Set([".ts", ".tsx", ".js", ".mjs"]);

// ---------------------------------------------------------------------------
// Whitelist: files where fetch calls are known-safe (legacy or by-design).
// Every entry MUST include a reason. Adding an entry requires a code comment
// explaining why HEFF wrapping is unnecessary for that call site.
// ---------------------------------------------------------------------------
const FILE_WHITELIST = new Map([
    // Source of truth for HEFF helpers — contains the canonical fetch() wrapper.
    ["src/shared/http-fail-fast.ts", "HEFF source file — contains canonical fetch wrapper"],

    // Already wraps fetch with its own error handling and reports via LovableApiError.
    ["standalone-scripts/lovable-common/src/api/lovable-http.ts", "Already routes through readBodyOrThrow + LovableApiError"],

    // Webhook sender has its own webhook-fail-fast contract (single-attempt, no-retry).
    ["src/background/recorder/step-library/result-webhook.ts", "Covered by webhook-fail-fast policy (single-attempt, no-retry)"],

    // Extension-internal asset fetches via chrome.runtime.getURL(); these never return 4xx/5xx
    // in normal operation because they load from the extension's own dist/ folder.
    ["src/background/db-manager.ts", "WASM local asset fetch + network-error catch only"],
    ["src/background/project-db-manager.ts", "WASM local asset fetch + network-error catch only"],
    ["src/background/wasm-integrity.ts", "WASM local asset fetch + network-error catch only"],

    // Project-namespace-builder emits fetch() into generated code strings for the MAIN-world SDK.
    // These are not agent-driven calls; they run inside the page context.
    ["src/background/project-namespace-builder.ts", "Generated MAIN-world SDK code strings, not agent-driven"],

    // Marco SDK — page-context runtime, not agent-driven.
    ["standalone-scripts/marco-sdk/src/self-namespace.ts", "Page-context SDK runtime, not agent-driven"],

    // UI / component fetches with manual ok-check or user-initiated.
    ["src/components/options/ErrorSwallowAuditView.tsx", "User-triggered audit fetch with manual ok check"],
    ["src/components/options/ScriptBundleDetailView.tsx", "User-triggered update fetch with manual ok check"],

    // Documentation / generated files.
    ["src/lib/generate-llm-guide.ts", "Documentation generation helper, not runtime"],
    ["src/content-scripts/network-reporter.ts", "Content-script network intercept, not agent-driven"],
    ["src/content-scripts/home-screen/credit-source.ts", "Content-script credit proxy, not agent-driven"],
    ["src/platform/preview-adapter.ts", "Preview iframe injection strings, not agent-driven"],
    ["src/components/options/monaco-js-intellisense.ts", "Monaco type fetch for UI editor, not agent-driven"],
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function walk(dir, files = []) {
    for (const entry of readdirSync(dir)) {
        const abs = join(dir, entry);
        const s = statSync(abs);
        if (s.isDirectory()) {
            if (entry.startsWith(".") || entry === "node_modules" || entry === "dist" || entry === ".release" || entry === "skipped") {
                continue;
            }
            walk(abs, files);
        } else if (s.isFile() && EXT_ALLOWLIST.has(extname(entry))) {
            files.push(abs);
        }
    }
    return files;
}

function relPath(absPath) {
    return absPath.replace(ROOT + "/", "");
}

function isCommentOrBlank(line) {
    const t = line.trim();
    return t === "" || t.startsWith("//") || (t.startsWith("*") && !t.includes("fetch(")) || t.startsWith("/*") || t.startsWith("*/");
}

function isGlobalFetch(line) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) return false;
    // Reject method calls like .fetch( or credits.fetch(
    if (/\.\s*fetch\s*\(/.test(trimmed)) return false;
    // Match global fetch( or await fetch(
    return /\bfetch\s*\(/.test(trimmed);
}

function isInsideString(line) {
    const t = line.trim();
    // Heuristic: if the whole line is inside backticks or quotes with fetch(
    const backtickCount = (t.match(/`/g) || []).length;
    const singleQuoteCount = (t.match(/'/g) || []).length;
    const doubleQuoteCount = (t.match(/"/g) || []).length;
    // Odd number of unescaped quotes suggests inside a string
    if (backtickCount >= 2 && t.indexOf("fetch(") > t.indexOf("`") && t.lastIndexOf("`") > t.indexOf("fetch(")) return true;
    return false;
}

function hasGuardNearby(lines, fetchIdx) {
    // Look at next few non-comment lines (allow up to 3 lines of gap for multi-line fetch())
    let seen =  0;
    for (let i = fetchIdx + 1; i < lines.length && seen < 6; i++) {
        const t = lines[i].trim();
        if (isCommentOrBlank(lines[i])) continue;
        seen++;
        if (t.includes("httpFailFast") || t.includes("httpFetchOrThrow")) return true;
        if (t.includes(".ok")) return true;
        if (t.startsWith("} catch")) return true;
        // If we hit a new statement or closing brace before finding a guard, stop
        if (t.startsWith("const ") || t.startsWith("let ") || t.startsWith("var ") || t.startsWith("return ")) return false;
        if (t === "}" || t.startsWith("function ") || t.startsWith("async ")) return false;
    }
    return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const violations = [];
const srcFiles = walk(join(ROOT, "src"));
const standaloneFiles = walk(join(ROOT, "standalone-scripts"));
const allFiles = [...srcFiles, ...standaloneFiles];

for (const abs of allFiles) {
    const rel = relPath(abs);
    const content = readFileSync(abs, "utf-8");
    const lines = content.split("\n");

    // File-level whitelist
    if (FILE_WHITELIST.has(rel)) continue;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!isGlobalFetch(line)) continue;
        if (isInsideString(line)) continue;

        // Already guarded?
        if (hasGuardNearby(lines, i)) continue;

        violations.push({ rel, line: i + 1, text: line.trim() });
    }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (violations.length === 0) {
    console.log("✅ [no-bare-fetch] No bare fetch() violations found.");
    process.exit(0);
}

console.error("\n❌ [no-bare-fetch] " + violations.length + " bare fetch() violation(s) found:\n");
for (const v of violations) {
    console.error("   " + v.rel + ":" + v.line);
    console.error("   →  " + v.text);
    console.error("");
}
console.error("Fix: wrap the fetch with httpFailFast() / httpFetchOrThrow(), add an immediate .ok check,");
console.error("or whitelist the file in scripts/lint/no-bare-fetch.mjs with a documented reason.\n");
process.exit(1);
