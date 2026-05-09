#!/usr/bin/env node
/**
 * CI guard: package scripts that are launched from PowerShell/CI via npm or
 * pnpm must not invoke `pnpm run ...` again inside the script body.
 *
 * pnpm v11 may run a dependency-status install check before a nested script
 * starts. On Windows non-TTY shells this can abort with:
 * ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY.
 *
 * Use the underlying Node script directly instead of nesting `pnpm run`.
 */
import { readFileSync } from "node:fs";

const TARGET = "package.json";
const SCRIPT_NAMES = ["build:macro-controller", "build:marco-sdk", "build:extension"];
const FORBIDDEN_RE = /(^|&&|\|\||;)\s*pnpm\s+run\s+/;

const pkg = JSON.parse(readFileSync(TARGET, "utf-8"));
const scripts = pkg && typeof pkg === "object" && pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
const failures = [];

for (const name of SCRIPT_NAMES) {
    const command = scripts[name];
    if (typeof command === "string" && FORBIDDEN_RE.test(command)) {
        failures.push({ name, command });
    }
}

if (failures.length > 0) {
    console.error("[FAIL] Nested pnpm run found in standalone/extension build scripts.");
    console.error("Reason: nested pnpm can trigger a dependency install check and fail on Windows without a TTY.");
    console.error("Fix: call the underlying node script directly instead of `pnpm run ...`.");
    for (const failure of failures) {
        console.error("  - " + TARGET + " scripts." + failure.name);
        console.error("    " + failure.command);
    }
    process.exit(1);
}

console.log("[OK] No nested pnpm run in standalone/extension build scripts");