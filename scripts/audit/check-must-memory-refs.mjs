#!/usr/bin/env node
// Audit: every spec file that contains a normative MUST/SHALL/MUST NOT
// statement MUST cite at least one `mem://` URL so the rule is traceable
// back to project memory.
//
// Rationale: prevents new MUST rules from drifting unbacked.
// Scope: spec/2026-spec/**/*.md, excluding _audit-*, _archive*, OWNERS.md,
// README.md (index files), and files whose only MUST appears in fenced code.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SPEC_ROOT = "spec/2026-spec";
const SKIP_DIR_RX = /\/_audit-|\/_archive|\/99-spec-issues\//;
const SKIP_FILE_RX = /(?:^|\/)(README|OWNERS|ACCEPTANCE-MATRIX|IMPLEMENTATION-CHECKLIST)\.md$/;
const MUST_RX = /\b(MUST(?:\s+NOT)?|SHALL(?:\s+NOT)?)\b/;
const MEM_RX = /mem:\/\/[\w./~-]+/;

function listSpecFiles() {
  const out = execSync(`git ls-files ${SPEC_ROOT}`, { encoding: "utf8" });
  return out.split("\n").filter(Boolean).filter((path) => path.endsWith(".md"));
}

function stripFences(content) {
  return content.replace(/```[\s\S]*?```/g, "");
}

function hasNormativeMust(prose) {
  return MUST_RX.test(prose);
}

function hasMemoryRef(content) {
  return MEM_RX.test(content);
}

function isSkipped(path) {
  if (SKIP_DIR_RX.test(path)) {
    return true;
  }
  return SKIP_FILE_RX.test(path);
}

function auditFile(path) {
  const content = readFileSync(path, "utf8");
  const prose = stripFences(content);
  if (!hasNormativeMust(prose)) {
    return null;
  }
  if (hasMemoryRef(content)) {
    return null;
  }
  return path;
}

function main() {
  const files = listSpecFiles().filter((path) => !isSkipped(path));
  const failures = files.map(auditFile).filter(Boolean);
  if (failures.length === 0) {
    console.log(`check-must-memory-refs OK — ${files.length} files scanned`);
    return;
  }
  console.error(`check-must-memory-refs FAILED — ${failures.length} file(s) contain MUST/SHALL but no mem:// reference:`);
  for (const path of failures) {
    console.error(`  - ${path}`);
  }
  console.error("");
  console.error("Fix: add a footer linking the owning memory file, e.g.:");
  console.error("  > Owner: see [mem://standards/...](mem://standards/...)");
  process.exit(1);
}

main();
