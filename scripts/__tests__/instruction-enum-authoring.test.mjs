#!/usr/bin/env node

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STANDALONE_DIR = join(REPO_ROOT, "standalone-scripts");
const INSTRUCTION_LITERAL_RE = /\b(World|RunAt|MatchType|Inject)\s*:\s*["'](MAIN|ISOLATED|document_start|document_end|document_idle|glob|regex|exact|head)["']/;

function readText(relativePath) {
    return readFileSync(join(REPO_ROOT, relativePath), "utf-8");
}

function listInstructionSources() {
    return readdirSync(STANDALONE_DIR)
        .map((name) => join(STANDALONE_DIR, name, "src", "instruction.ts"))
        .filter((filePath) => existsSync(filePath) && statSync(filePath).isFile());
}

test("instruction manifests use shared enum members for closed string sets", () => {
    const offenders = [];
    for (const filePath of listInstructionSources()) {
        const text = readFileSync(filePath, "utf-8");
        const lines = text.split("\n");
        for (let index = 0; index < lines.length; index++) {
            if (INSTRUCTION_LITERAL_RE.test(lines[index])) {
                offenders.push(`${relative(REPO_ROOT, filePath)}:${index + 1}:${lines[index].trim()}`);
            }
        }
    }

    assert.deepStrictEqual(offenders, []);
});

test("shared instruction types expose enum-backed closed string properties", () => {
    const projectInstruction = readText("standalone-scripts/types/instruction/project-instruction.ts");
    const seedBlock = readText("standalone-scripts/types/instruction/seed/seed-block.ts");
    const targetUrl = readText("standalone-scripts/types/instruction/seed/target-url.ts");
    const cssAsset = readText("standalone-scripts/types/instruction/assets/css-asset.ts");

    assert.match(projectInstruction, /readonly World: InjectionWorld;/);
    assert.match(seedBlock, /readonly RunAt\?: InjectionRunAt;/);
    assert.match(targetUrl, /readonly MatchType: MatchType;/);
    assert.match(cssAsset, /readonly Inject: AssetInjectTarget;/);
});

test("compile-instruction resolves enum member values without running TypeScript", () => {
    const compiler = readText("scripts/compile-instruction.mjs");

    assert.match(compiler, /const InjectionWorld = \{ Main: "MAIN", Isolated: "ISOLATED" \};/);
    assert.match(compiler, /const InjectionRunAt = \{ DocumentStart: "document_start", DocumentEnd: "document_end", DocumentIdle: "document_idle" \};/);
    assert.match(compiler, /const MatchType = \{ Glob: "glob", Regex: "regex", Exact: "exact" \};/);
    assert.match(compiler, /const AssetInjectTarget = \{ Head: "head" \};/);
});