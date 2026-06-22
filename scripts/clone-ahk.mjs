#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

const CANONICAL_REPO = "aukgit/macro-ahk-v51";
const STALE_REPO = "alimtvnetwork/macro-ahk-v51";
const DEFAULT_TARGET = "macro-ahk";
const DEFAULT_BRANCH = "main";

function printHelp() {
    console.log(`Usage: node scripts/clone-ahk.mjs [--target DIR] [--repo OWNER/REPO] [--branch BRANCH]

Defaults:
  --repo    ${CANONICAL_REPO}
  --target  ${DEFAULT_TARGET}
  --branch  ${DEFAULT_BRANCH}

The clone is shallow, single-branch, blob-filtered, and tagless to avoid large GitHub transfers.`);
}

function readOption(args, flag, fallback) {
    const index = args.indexOf(flag);
    if (index === -1) {
        return fallback;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
        console.error(`Error: ${flag} requires a value (Reason=MissingArgument; ReasonDetail=Expected value after ${flag})`);
        process.exit(2);
    }
    return value;
}

function normalizeRepo(rawRepo) {
    let repo = rawRepo.trim();
    repo = repo.replace(/^https:\/\/github\.com\//i, "").replace(/\.git$/i, "");
    if (repo.toLowerCase() === STALE_REPO) {
        console.error(`Warning: stale repo owner '${STALE_REPO}' replaced with '${CANONICAL_REPO}'.`);
        return CANONICAL_REPO;
    }
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
        console.error(`Error: invalid repo '${rawRepo}' (Reason=InvalidRepo; ReasonDetail=Expected owner/repo or https://github.com/owner/repo.git)`);
        process.exit(2);
    }
    return repo;
}

function assertTargetAvailable(targetPath) {
    if (!existsSync(targetPath)) {
        return;
    }
    const entries = readdirSync(targetPath);
    if (entries.length === 0) {
        return;
    }
    console.error(`Error: target path is not empty: ${targetPath}`);
    console.error("Reason=TargetNotEmpty; ReasonDetail=Refusing to overwrite an existing non-empty clone target.");
    process.exit(1);
}

function main() {
    const args = process.argv.slice(2);
    if (args.includes("--help") || args.includes("-h")) {
        printHelp();
        return;
    }

    const repo = normalizeRepo(readOption(args, "--repo", process.env.MARCO_AHK_REPO || CANONICAL_REPO));
    const target = readOption(args, "--target", readOption(args, "--dir", process.env.MARCO_AHK_TARGET || DEFAULT_TARGET));
    const branch = readOption(args, "--branch", process.env.MARCO_AHK_BRANCH || DEFAULT_BRANCH);
    const targetPath = resolve(process.cwd(), target);
    const repoUrl = `https://github.com/${repo}.git`;

    assertTargetAvailable(targetPath);

    const gitCheck = spawnSync("git", ["--version"], { encoding: "utf8" });
    if (gitCheck.status !== 0) {
        console.error("Error: git executable missing from PATH (Reason=GitMissing; ReasonDetail=git is required for the AHK sidecar clone).");
        process.exit(1);
    }

    console.log(`Cloning ${repo.split("/")[1]} into ${basename(targetPath)}...`);
    console.log(`  [clone] target free, shallow cloning directly into ${targetPath}`);

    const cloneArgs = [
        "-c", "http.version=HTTP/1.1",
        "clone",
        "--depth=1",
        "--single-branch",
        "--filter=blob:none",
        "--no-tags",
        "--branch", branch,
        repoUrl,
        targetPath,
    ];
    const result = spawnSync("git", cloneArgs, { stdio: "inherit" });
    if (result.status !== 0) {
        const status = result.status ?? 1;
        console.error(`Error: clone failed for ${repoUrl}: exit status ${status} (operation: git-clone)`);
        process.exit(status);
    }
}

main();