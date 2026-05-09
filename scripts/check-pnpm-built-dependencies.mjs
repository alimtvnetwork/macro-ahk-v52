#!/usr/bin/env node
/**
 * CI guard: ensures package.json declares pnpm.onlyBuiltDependencies
 * for native packages that need post-install scripts (@swc/core, esbuild).
 *
 * Without this, pnpm v10+ aborts with ERR_PNPM_IGNORED_BUILDS during the
 * `prepare` lifecycle on Windows because there is no TTY to run
 * `pnpm approve-builds` interactively.
 */
import { readFileSync } from "node:fs";

const REQUIRED = ["@swc/core", "esbuild"];
const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const allowed = pkg?.pnpm?.onlyBuiltDependencies ?? [];
const missing = REQUIRED.filter((name) => !allowed.includes(name));

if (missing.length > 0) {
    console.error("[FAIL] package.json is missing pnpm.onlyBuiltDependencies entries:");
    for (const name of missing) console.error("  - " + name);
    console.error("Reason: pnpm v10+ blocks native build scripts by default and prompts for");
    console.error("        `pnpm approve-builds`, which fails on Windows CI without a TTY.");
    console.error("Fix: add the names above to package.json -> pnpm.onlyBuiltDependencies.");
    process.exit(1);
}

console.log("[OK] package.json approves required pnpm built dependencies (" + REQUIRED.join(", ") + ")");