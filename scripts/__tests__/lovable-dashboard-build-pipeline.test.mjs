#!/usr/bin/env node
/**
 * Build-pipeline wiring test for standalone-scripts/lovable-dashboard.
 *
 * Verifies that every orchestration file required to build, cache, and
 * distribute the lovable-dashboard standalone bundle is correctly wired.
 *
 * This is a fast, no-build test — it reads config files and asserts
 * structural correctness so that a broken pipeline surfaces in <1s
 * instead of after a 30s failed vite build.
 *
 * Author: Riseup Asia LLC
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function readJson(rel) {
    const abs = resolve(REPO_ROOT, rel);
    if (!existsSync(abs)) return null;
    return JSON.parse(readFileSync(abs, "utf8"));
}

function readText(rel) {
    const abs = resolve(REPO_ROOT, rel);
    if (!existsSync(abs)) return null;
    return readFileSync(abs, "utf8");
}

function assertExists(rel, kind) {
    const abs = resolve(REPO_ROOT, rel);
    assert.ok(existsSync(abs), `${kind} missing: ${rel} (expected at ${abs})`);
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

test("tsconfig.lovable-dashboard.json exists and includes project sources", () => {
    assertExists("tsconfig.lovable-dashboard.json", "tsconfig");
    const cfg = readJson("tsconfig.lovable-dashboard.json");
    assert.ok(cfg, "tsconfig.lovable-dashboard.json is valid JSON");
    const includes = cfg.include ?? [];
    assert.ok(
        includes.some((p) => p.includes("lovable-dashboard/src")),
        "tsconfig must include lovable-dashboard/src/**/*.ts",
    );
    assert.strictEqual(cfg.compilerOptions?.module, "ESNext", "module must be ESNext");
    assert.strictEqual(cfg.compilerOptions?.moduleResolution, "bundler", "moduleResolution must be bundler");
});

test("vite.config.lovable-dashboard.ts exists and points to correct entry", () => {
    assertExists("vite.config.lovable-dashboard.ts", "vite config");
    const src = readText("vite.config.lovable-dashboard.ts");
    assert.ok(src, "vite.config.lovable-dashboard.ts is readable");
    assert.ok(src.includes("LovableDashboard"), "vite config must expose library name 'LovableDashboard'");
    assert.ok(src.includes("lovable-dashboard/src/index.ts"), "vite config entry must point to lovable-dashboard/src/index.ts");
    assert.ok(src.includes('"iife"'), "vite config must emit IIFE format");
    assert.ok(src.includes("lovable-dashboard/dist"), "vite config outDir must be lovable-dashboard/dist");
});

test("entry point standalone-scripts/lovable-dashboard/src/index.ts exists", () => {
    assertExists("standalone-scripts/lovable-dashboard/src/index.ts", "entry point");
});

test("package.json has build:lovable-dashboard script", () => {
    const pkg = readJson("package.json");
    assert.ok(pkg, "package.json is valid JSON");
    const script = pkg.scripts?.["build:lovable-dashboard"];
    assert.ok(script, "package.json scripts must contain 'build:lovable-dashboard'");
    assert.ok(script.includes("lovable-dashboard"), "build:lovable-dashboard script must reference lovable-dashboard");
    assert.ok(script.includes("run-standalone-build-step.mjs"), "build:lovable-dashboard script must invoke run-standalone-build-step.mjs");
});

test("run-standalone-build-step.mjs knows lovable-dashboard", () => {
    const src = readText("scripts/run-standalone-build-step.mjs");
    assert.ok(src, "run-standalone-build-step.mjs is readable");
    assert.ok(src.includes('"lovable-dashboard"'), "run-standalone-build-step.mjs must list lovable-dashboard in PROJECTS");
});

test("cached-build validates lovable-dashboard primary bundle before cache hit exit", () => {
    const src = readText("scripts/cached-build.mjs");
    assert.ok(src, "cached-build.mjs is readable");
    assert.ok(src.includes('"lovable-dashboard": "lovable-dashboard.js"'), "cached-build must know lovable-dashboard primary bundle");
    assert.ok(src.includes("validateRequiredPrimaryBundle"), "cached-build must validate restored and freshly-built primary bundles");
    assert.ok(src.includes("continuing with a fresh build"), "cached-build must rebuild instead of exiting 0 on an invalid cache hit");
});

test("build-standalone.mjs exports lovable-dashboard in PROJECTS array", () => {
    const src = readText("scripts/build-standalone.mjs");
    assert.ok(src, "build-standalone.mjs is readable");
    assert.ok(src.includes('"lovable-dashboard"'), "build-standalone.mjs PROJECTS must include lovable-dashboard");
});

test("info.json has correct slug and version", () => {
    assertExists("standalone-scripts/lovable-dashboard/info.json", "info.json");
    const info = readJson("standalone-scripts/lovable-dashboard/info.json");
    assert.ok(info, "info.json is valid JSON");
    assert.strictEqual(info.slug, "lovable-dashboard", "info.json slug must be 'lovable-dashboard'");
    assert.ok(info.version, "info.json must have a version");
    assert.ok(info.title, "info.json must have a title");
});

test("instruction.ts exists (required for compile-instruction step)", () => {
    assertExists("standalone-scripts/lovable-dashboard/src/instruction.ts", "instruction.ts");
});

test("lovable-dashboard dist directory structure is prepared", () => {
    const distDir = resolve(REPO_ROOT, "standalone-scripts/lovable-dashboard/dist");
    // dist/ may not exist yet (build hasn't run), but its parent must.
    const parent = dirname(distDir);
    assert.ok(existsSync(parent), "standalone-scripts/lovable-dashboard/ parent directory must exist");
});

test("release workflow builds and publishes lovable-dashboard zip", () => {
    const src = readText(".github/workflows/release.yml");
    assert.ok(src, "release.yml is readable");
    assert.ok(src.includes("pnpm run build:lovable-dashboard"), "release workflow must build lovable-dashboard before packaging");
    assert.ok(src.includes('"lovable-dashboard"'), "release workflow plugin list must include lovable-dashboard");
    assert.ok(src.includes("lovable-dashboard-${VER}.zip"), "release workflow must publish lovable-dashboard versioned ZIP");
});
