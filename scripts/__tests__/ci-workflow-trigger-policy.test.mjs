#!/usr/bin/env node
/**
 * CI workflow trigger policy tests.
 *
 * Guards against the regression where Lovable/GitHub branch commits do not
 * start CI because `.github/workflows/ci.yml` only listens to `main` pushes.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const CI_WORKFLOW = resolve(REPO_ROOT, ".github/workflows/ci.yml");

function readCiWorkflow() {
    assert.ok(existsSync(CI_WORKFLOW), `CI workflow missing at ${CI_WORKFLOW}`);
    return readFileSync(CI_WORKFLOW, "utf8");
}

test("CI Build triggers on every branch push", () => {
    const src = readCiWorkflow();
    assert.match(
        src,
        /on:\s*\n\s*push:\s*\n\s*branches:\s*\n\s*- "\*\*"/,
        "ci.yml push trigger must include every branch so Lovable/GitHub branch commits build before PR/main",
    );
});

test("CI Build does not keep main-only push guards on required downstream jobs", () => {
    const src = readCiWorkflow();
    assert.doesNotMatch(
        src,
        /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/,
        "ci.yml required jobs must not be skipped on non-main push events",
    );
});