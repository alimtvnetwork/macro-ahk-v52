#!/usr/bin/env node
/**
 * Standalone-script scaffolder (Priority 0.12).
 *
 * Usage:  pnpm new:standalone <name>
 *
 * Generates `standalone-scripts/<name>/` with:
 *   - src/instruction.ts   (uses ProjectInstruction<EmptySettings> + enum-authored closed sets)
 *   - src/index.ts         (single-class entry stub)
 *   - vite.config.ts       (mirrors payment-banner-hider build shape)
 *   - tsconfig.json
 *   - dist/.gitignore
 *
 * Intentionally fail-fast (no retry/backoff per project no-retry policy).
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const rawName = process.argv[2];

if (rawName === undefined || rawName === "") {
    console.error("[new-standalone] missing <name> argument");
    console.error("  usage: pnpm new:standalone <kebab-case-name>");
    process.exit(1);
}

const name = rawName.trim();

if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error(`[new-standalone] invalid name "${name}" — must be kebab-case (a-z, 0-9, -)`);
    process.exit(1);
}

const targetDir = resolve(repoRoot, "standalone-scripts", name);

if (existsSync(targetDir)) {
    console.error(`[new-standalone] target already exists: ${targetDir}`);
    process.exit(1);
}

const pascal = name
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");

const files = {
    "src/instruction.ts": `import type { ProjectInstruction, EmptySettings } from "../../types/instruction";
import { InjectionWorld, InjectionRunAt, MatchType, AssetInjectTarget } from "../../types/instruction";

const instruction: ProjectInstruction<EmptySettings> = {
    Id: "${name}",
    Name: "${pascal}",
    Version: "0.1.0",
    Description: "TODO: describe ${name}",
    Targets: [{ MatchType: MatchType.UrlPrefix, Value: "https://example.com/" }],
    Injection: {
        World: InjectionWorld.Main,
        RunAt: InjectionRunAt.DocumentIdle,
        Assets: [{ Target: AssetInjectTarget.Iife, Path: "dist/index.iife.js" }],
    },
    Settings: {} as EmptySettings,
};

export default instruction;
`,
    "src/index.ts": `/**
 * ${pascal} — Standalone Script (scaffolded by scripts/new-standalone.mjs).
 *
 * Single-class entry. Replace this body with real behaviour.
 */

export class ${pascal} {
    public readonly version = "0.1.0";

    public start(): void {
        // TODO: implement
    }
}

const instance = new ${pascal}();
(window as unknown as Record<string, unknown>)["${pascal}"] = instance;
instance.start();
`,
    "vite.config.ts": `import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    build: {
        emptyOutDir: false,
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "${pascal}",
            formats: ["iife"],
            fileName: () => "index.iife.js",
        },
        outDir: "dist",
        sourcemap: process.env.NODE_ENV === "production" ? false : "inline",
    },
});
`,
    "tsconfig.json": `{
    "extends": "../tsconfig.base.json",
    "include": ["src/**/*.ts", "../types/**/*.ts", "../types/**/*.d.ts"],
    "compilerOptions": { "outDir": "dist" }
}
`,
    "dist/.gitignore": `*
!.gitignore
`,
};

mkdirSync(targetDir, { recursive: true });

for (const [relPath, content] of Object.entries(files)) {
    const absPath = resolve(targetDir, relPath);
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content, "utf8");
}

console.log(`[new-standalone] scaffolded standalone-scripts/${name}/`);
console.log(`  next: edit src/instruction.ts Targets + Settings, run pnpm -w build`);
