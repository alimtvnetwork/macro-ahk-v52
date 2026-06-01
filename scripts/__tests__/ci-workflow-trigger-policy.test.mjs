#!/usr/bin/env node
/**
 * CI workflow trigger policy tests.
 *
 * Guards against the regression where Lovable/GitHub branch commits do not
 * start CI because `.github/workflows/ci.yml` only listens to `main` pushes.
 *
 * NOTE: Intentionally avoids the external `yaml` package so this test runs
 * in a bare Node.js environment (no `npm install` required).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const CI_WORKFLOW = resolve(REPO_ROOT, ".github/workflows/ci.yml");
const PING_WORKFLOW = resolve(REPO_ROOT, ".github/workflows/ping.yml");
const RELEASE_WATCHER_WORKFLOW = resolve(REPO_ROOT, ".github/workflows/release-watcher.yml");

/**
 * Naïve YAML top-level key extractor.  Only needs to recognise:
 *   on:
 *     push:
 *       branches: [...]
 *   on: [push, pull_request]
 *   "on": ...
 *
 * We read the first document, strip comments/quoted strings, then look for
 * the `on:` key and, if it is followed by an inline block, capture the lines
 * until indentation drops back to root level.
 */
function extractOnBlock(raw) {
    const lines = raw.split(/\r?\n/);

    // Find the line that starts the `on:` block
    let startIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        // Match "on:", "on: ", '"on":', "'on':" etc.
        if (/^['"]?on['"]?:\s*$/.test(trimmed) || /^['"]?on['"]?:\s+/.test(trimmed)) {
            startIdx = i;
            break;
        }
    }
    if (startIdx === -1) return null;

    // Determine base indentation of the `on:` line
    const baseMatch = lines[startIdx].match(/^(\s*)/);
    const baseIndent = baseMatch ? baseMatch[1].length : 0;

    // Collect child lines until we hit a line at <= baseIndent (or EOF)
    const children = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        // Empty lines or comment-only lines do not terminate the block
        if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
            continue;
        }
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1].length : 0;
        if (indent <= baseIndent) {
            break; // next root key
        }
        children.push(line);
    }
    return children.join("\n");
}

function hasTopLevelPush(raw) {
    const block = extractOnBlock(raw);
    if (!block) return false;
    // Look for `push:` or `- push` or `[push,` inside the `on:` block
    return /\bpush\b/.test(block);
}

function pushHasNoFilters(raw) {
    const block = extractOnBlock(raw);
    if (!block) return true; // no on block == no filters
    // Within the `push:` sub-block (indented further), reject filters
    const lines = block.split("\n");
    let inPushBlock = false;
    let pushIndent = Infinity;

    for (const line of lines) {
        const trimmed = line.trim();
        if (/^push:\s*$/.test(trimmed) || /^push:\s+/.test(trimmed)) {
            inPushBlock = true;
            const m = line.match(/^(\s*)/);
            pushIndent = m ? m[1].length : 0;
            continue;
        }
        if (!inPushBlock) continue;

        // If indentation drops back to or below pushIndent, we left the push block
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1].length : 0;
        if (indent <= pushIndent && trimmed.length > 0 && !/^\s*#/.test(line)) {
            inPushBlock = false;
            continue;
        }

        if (/^branches\b/.test(trimmed)) return false;
        if (/^branches-ignore\b/.test(trimmed)) return false;
        if (/^paths\b/.test(trimmed)) return false;
        if (/^paths-ignore\b/.test(trimmed)) return false;
    }
    return true;
}

function extractIndentedBlock(raw, key, indent) {
    const lines = raw.split(/\r?\n/);
    const expectedPrefix = " ".repeat(indent);
    const start = lines.findIndex((line) => line === `${expectedPrefix}${key}:`);
    if (start === -1) return null;

    const block = [];
    for (let i = start + 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
            block.push(line);
            continue;
        }
        const indentMatch = line.match(/^(\s*)/);
        const currentIndent = indentMatch ? indentMatch[1].length : 0;
        if (currentIndent <= indent) break;
        block.push(line);
    }
    return block.join("\n");
}

function extractNeeds(block) {
    const lines = block.split(/\r?\n/);
    const needsLineIndex = lines.findIndex((line) => /^\s+needs:\s*/.test(line));
    if (needsLineIndex === -1) return [];

    const line = lines[needsLineIndex].trim();
    if (/^needs:\s*\[/.test(line)) {
        return line.replace(/^needs:\s*\[/, "").replace(/\].*$/, "").split(",").map((value) => value.trim()).filter(Boolean);
    }
    const single = line.match(/^needs:\s+(.+)$/);
    if (single) return [single[1].trim()];

    const needs = [];
    for (let i = needsLineIndex + 1; i < lines.length; i++) {
        const current = lines[i];
        const item = current.trim().match(/^-\s+(.+)$/);
        if (item) {
            needs.push(item[1].trim());
            continue;
        }
        if (/^\s+\w/.test(current)) break;
    }
    return needs;
}

test("CI Build triggers on every branch push (no filters)", () => {
    assert.ok(existsSync(CI_WORKFLOW), `Workflow missing at ${CI_WORKFLOW}`);
    const src = readFileSync(CI_WORKFLOW, "utf8");
    assert.ok(hasTopLevelPush(src), "ci.yml must trigger on push");
    assert.ok(pushHasNoFilters(src), "ci.yml push must not have branch/path filters");
});

test("CI Build has no main-only push guards on required jobs", () => {
    const src = readFileSync(CI_WORKFLOW, "utf8");
    assert.doesNotMatch(
        src,
        /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/,
        "ci.yml required jobs must not be skipped on non-main push events",
    );
});

test("E2E-23 only runs in its dedicated retry-enabled CI job", () => {
    const src = readFileSync(CI_WORKFLOW, "utf8");
    const generalE2e = extractIndentedBlock(src, "e2e", 2);
    const e2e23 = extractIndentedBlock(src, "e2e-23-multi-tab-sync", 2);

    assert.ok(generalE2e, "ci.yml must keep the broad e2e job");
    assert.ok(e2e23, "ci.yml must keep the dedicated E2E-23 job");
    assert.match(
        generalE2e,
        /--grep-invert\s+"E2E-23\|Multi-Tab State Synchronization"/,
        "broad e2e job must exclude E2E-23 so the non-retry suite cannot fail it first",
    );
    assert.match(
        e2e23,
        /npx playwright install --with-deps chromium/,
        "dedicated E2E-23 job must explicitly install Chromium before running",
    );
    assert.match(
        e2e23,
        /e2e-23-multi-tab-sync\.spec\.ts/,
        "dedicated E2E-23 job must run the multi-tab sync spec",
    );
    assert.match(
        e2e23,
        /--retries=2/,
        "dedicated E2E-23 job must retry transient timeout failures",
    );
});

test("Ping diagnostic workflow exists and triggers on every push", () => {
    assert.ok(existsSync(PING_WORKFLOW), `Workflow missing at ${PING_WORKFLOW}`);
    const src = readFileSync(PING_WORKFLOW, "utf8");
    assert.ok(hasTopLevelPush(src), "ping.yml must trigger on push");
    assert.ok(pushHasNoFilters(src), "ping.yml push must not have filters");
});

test("Release Watcher asset guard can read the resolved release tag", () => {
    assert.ok(existsSync(RELEASE_WATCHER_WORKFLOW), `Workflow missing at ${RELEASE_WATCHER_WORKFLOW}`);
    const src = readFileSync(RELEASE_WATCHER_WORKFLOW, "utf8");
    const guardBlock = extractIndentedBlock(src, "release-asset-guard", 2);
    assert.ok(guardBlock, "release-asset-guard job must exist");
    const needs = extractNeeds(guardBlock);
    assert.ok(needs.includes("resolve-release"), "release-asset-guard must directly need resolve-release so VER is not empty");
    assert.ok(needs.includes("run-release"), "release-asset-guard must wait for run-release before checking assets");
});
