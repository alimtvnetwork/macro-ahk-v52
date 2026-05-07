/**
 * Tests for scripts/check-changelog-entry.mjs
 *
 * Spawns the checker in synthetic temp directories with hand-built
 * `manifest.json` + `changelog.md` pairs. Validates exit codes and
 * diagnostic messages for every documented failure mode + the
 * happy-path canonical template.
 *
 * Pattern mirrors scripts/__tests__/check-readme-txt.test.mjs.
 *
 * Note: the checker resolves its target files via
 *   resolve(dirname(import.meta.url), "..", "manifest.json" | "changelog.md")
 * — i.e. RELATIVE TO THE SCRIPT, not cwd. To run it against synthetic
 * fixtures we copy the script into a temp dir and place fixtures in the
 * temp dir's parent (../manifest.json, ../changelog.md from the script).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  mkdirSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REAL_CHECKER = resolve(
  fileURLToPath(new URL("../check-changelog-entry.mjs", import.meta.url)),
);

/**
 * Set up an isolated sandbox:
 *   <tmp>/manifest.json
 *   <tmp>/changelog.md
 *   <tmp>/scripts/check-changelog-entry.mjs   (copy of the real script)
 *
 * The script's `ROOT = resolve(dirname(__file__), "..")` then points at
 * <tmp>, so it picks up our fixtures.
 */
function runWith({ manifest, changelog }) {
  const dir = mkdtempSync(join(tmpdir(), "changelog-entry-check-"));
  try {
    if (manifest !== undefined) {
      writeFileSync(join(dir, "manifest.json"), manifest, "utf8");
    }
    if (changelog !== undefined) {
      writeFileSync(join(dir, "changelog.md"), changelog, "utf8");
    }
    mkdirSync(join(dir, "scripts"));
    const sandboxedChecker = join(dir, "scripts", "check-changelog-entry.mjs");
    copyFileSync(REAL_CHECKER, sandboxedChecker);

    const result = spawnSync(process.execPath, [sandboxedChecker], {
      cwd: dir,
      encoding: "utf8",
    });
    return {
      code: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const VALID_MANIFEST = JSON.stringify({ manifest_version: 3, version: "2.231.0" }, null, 2);
const VALID_HEADING = "## [v2.231.0] — 2026-05-06 Webhook delivery types";
const VALID_CHANGELOG = `# Changelog\n\n${VALID_HEADING}\n\n- something\n`;

test("PASS: manifest version + canonical changelog heading", () => {
  const r = runWith({ manifest: VALID_MANIFEST, changelog: VALID_CHANGELOG });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /✅ Changelog entry for v2\.231\.0 matches required template \(2026-05-06\)/);
});

test("FAIL: manifest.json missing", () => {
  const r = runWith({ changelog: VALID_CHANGELOG });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Missing required file:.*manifest\.json/);
});

test("FAIL: changelog.md missing", () => {
  const r = runWith({ manifest: VALID_MANIFEST });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Missing required file:.*changelog\.md/);
});

test("FAIL: manifest.json invalid JSON", () => {
  const r = runWith({ manifest: "{ not json", changelog: VALID_CHANGELOG });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Could not parse JSON/);
});

test("FAIL: manifest.json missing version field", () => {
  const r = runWith({
    manifest: JSON.stringify({ manifest_version: 3 }),
    changelog: VALID_CHANGELOG,
  });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Could not read a valid "version" field/);
});

test("FAIL: manifest.json malformed version (not X.Y.Z)", () => {
  const r = runWith({
    manifest: JSON.stringify({ version: "2.231" }),
    changelog: VALID_CHANGELOG,
  });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Could not read a valid "version" field/);
});

test("FAIL: changelog has no heading for current version (lists nearest entries)", () => {
  const r = runWith({
    manifest: JSON.stringify({ version: "2.999.0" }),
    changelog: VALID_CHANGELOG,
  });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Changelog entry missing for current version/);
  assert.match(r.stderr, /Missing version: v2\.999\.0/);
  assert.match(r.stderr, /Nearest existing changelog entries/);
  assert.match(r.stderr, /v2\.231\.0/);
});

test("FAIL: heading mentions version but uses wrong heading level", () => {
  const r = runWith({
    manifest: VALID_MANIFEST,
    changelog: `# Changelog\n\n### [v2.231.0] — 2026-05-06 Title here\n`,
  });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /does not match the required template/);
  assert.match(r.stderr, /Heading level/);
});

test("FAIL: heading uses hyphen instead of em dash", () => {
  const r = runWith({
    manifest: VALID_MANIFEST,
    changelog: `# Changelog\n\n## [v2.231.0] - 2026-05-06 Title here\n`,
  });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /does not match the required template/);
  assert.match(r.stderr, /Em dash/);
});

test("FAIL: heading missing date", () => {
  const r = runWith({
    manifest: VALID_MANIFEST,
    changelog: `# Changelog\n\n## [v2.231.0] — Title here\n`,
  });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /does not match the required template/);
});

test("FAIL: heading missing title after date", () => {
  const r = runWith({
    manifest: VALID_MANIFEST,
    changelog: `# Changelog\n\n## [v2.231.0] — 2026-05-06\n`,
  });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /does not match the required template/);
});

test("FAIL: heading missing 'v' prefix on version", () => {
  const r = runWith({
    manifest: VALID_MANIFEST,
    changelog: `# Changelog\n\n## [2.231.0] — 2026-05-06 Title here\n`,
  });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /does not match the required template/);
});

test("FAIL: invalid date — month 13", () => {
  const r = runWith({
    manifest: VALID_MANIFEST,
    changelog: `# Changelog\n\n## [v2.231.0] — 2026-13-06 Title here\n`,
  });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /invalid date|does not match the required template/);
});
