#!/usr/bin/env node
/**
 * CI guard: ensures pnpm-config.ps1 emits the .npmrc keys that prevent
 * pnpm v9+ from triggering ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY
 * during nested `pnpm run` calls (e.g. build:macro-controller -> build:prompts).
 *
 * Required keys in EVERY .npmrc branch:
 *   - verify-deps-before-run=false   (skip the auto-reinstall check)
 *   - confirm-modules-purge=false    (don't prompt for TTY confirmation)
 */
import { readFileSync } from "node:fs";

const TARGET = "scripts/ps-modules/pnpm-config.ps1";
const REQUIRED = ["verify-deps-before-run=false", "confirm-modules-purge=false", "strict-dep-builds=false"];
const text = readFileSync(TARGET, "utf-8");
const missing = REQUIRED.filter((key) => !text.includes(key));

if (missing.length > 0) {
    console.error("[FAIL] " + TARGET + " is missing pnpm non-interactive keys:");
    for (const key of missing) console.error("  - " + key);
    console.error("Reason: nested `pnpm run` invocations crash on Windows without these keys (no TTY).");
    process.exit(1);
}

console.log("[OK] pnpm-config.ps1 emits non-interactive .npmrc keys");