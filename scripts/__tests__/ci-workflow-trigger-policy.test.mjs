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
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const CI_WORKFLOW = resolve(REPO_ROOT, ".github/workflows/ci.yml");
const PING_WORKFLOW = resolve(REPO_ROOT, ".github/workflows/ping.yml");

function readWorkflow(p) {
    assert.ok(existsSync(p), `Workflow missing at ${p}`);
    return parseYaml(readFileSync(p, "utf8"));
}

test("CI Build triggers on every branch push (no filters)", () => {
    const wf = readWorkflow(CI_WORKFLOW);
    // YAML `on:` becomes `true` when parsed because `on` is a YAML bool keyword.
    const on = wf.on ?? wf[true];
    assert.ok(on, "ci.yml must declare `on:` triggers");
    assert.ok("push" in on, "ci.yml must trigger on push");
    const push = on.push;
    // `push:` (empty/null) means "every push to every branch".
    if (push && typeof push === "object") {
        assert.ok(!("branches" in push), "push must not filter by branches");
        assert.ok(!("branches-ignore" in push), "push must not filter by branches-ignore");
        assert.ok(!("paths" in push), "push must not filter by paths");
        assert.ok(!("paths-ignore" in push), "push must not filter by paths-ignore");
    }
});

test("CI Build has no main-only push guards on required jobs", () => {
    const src = readFileSync(CI_WORKFLOW, "utf8");
    assert.doesNotMatch(
        src,
        /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/,
        "ci.yml required jobs must not be skipped on non-main push events",
    );
});

test("Ping diagnostic workflow exists and triggers on every push", () => {
    const wf = readWorkflow(PING_WORKFLOW);
    const on = wf.on ?? wf[true];
    assert.ok(on && "push" in on, "ping.yml must trigger on push");
    const push = on.push;
    if (push && typeof push === "object") {
        assert.ok(!("branches" in push), "ping push must not filter by branches");
        assert.ok(!("paths" in push), "ping push must not filter by paths");
    }
});
