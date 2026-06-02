#!/usr/bin/env node
/**
 * check-coding-guidelines-coverage.mjs — Batch B step 20.
 *
 * Fails CI if `.lovable/coding-guidelines.md` is missing any required token from
 * the coverage matrix (spec/audit/blind-ai-implementation-audit/coverage/coverage-gap.md).
 *
 * Rationale: the summary file is the entry point blind AI agents read first.
 * If a required project-critical rule is missing from it, the AI will violate
 * the rule. This script enforces that the summary stays in lock-step with
 * the gap-matrix's HIGH-severity items.
 *
 * Usage:
 *   node scripts/check-coding-guidelines-coverage.mjs           # human output
 *   node scripts/check-coding-guidelines-coverage.mjs --json    # JSON output
 */
import { readFileSync, existsSync } from 'node:fs';

const SUMMARY_PATH = '.lovable/coding-guidelines.md';

// Each entry: [token-or-regex, severity, human label]. Token must literally appear
// in the summary. Regex (RegExp instance) is matched against the summary as-is.
const REQUIRED = [
  ['CQ14', 'HIGH', 'CQ14 braces-always rule'],
  ['CQ15', 'HIGH', 'CQ15 newline-grouping rule'],
  ['Defensive property access', 'HIGH', 'Defensive ?./?? access'],
  ['CaughtError', 'HIGH', 'CaughtError type contract'],
  ['Logger.error', 'HIGH', 'Namespace Logger.error mandate'],
  ['CODE RED', 'HIGH', 'File-error CODE RED contract'],
  ['Failure log shape', 'HIGH', 'Mandatory failure-log shape'],
  ['SCREAMING_SNAKE_CASE', 'HIGH', 'Constant naming prefixes'],
  ['No short names', 'MED', 'Short-name ban'],
  ['No Supabase', 'HIGH', 'Supabase ban'],
  ['No PascalCase storage migration', 'HIGH', 'Storage migration ban'],
  ['getBearerToken()', 'HIGH', 'Unified auth contract'],
  ['No-retry policy', 'HIGH', 'No-retry policy'],
  ['Test-with-features', 'MED', 'Test-with-features mandate'],
  ['Dark-only theme', 'MED', 'Dark-only theme'],
  ['framer-motion', 'MED', 'Animation lib ban'],
  ['SP-1..SP-7', 'HIGH', 'readme.txt prohibitions SP-1..SP-7'],
  ['isNewTabOrBlankUrl()', 'MED', 'New-tab guard'],
  ['Timer/observer teardown', 'HIGH', 'Timer/observer teardown'],
];

if (!existsSync(SUMMARY_PATH)) {
  console.error(`[coverage] FATAL: ${SUMMARY_PATH} does not exist.`);
  process.exit(2);
}

const summary = readFileSync(SUMMARY_PATH, 'utf8');
const missing = [];
const present = [];

for (const [token, severity, label] of REQUIRED) {
  const found = typeof token === 'string'
    ? summary.includes(token)
    : token.test(summary);
  (found ? present : missing).push({ token: String(token), severity, label });
}

const highMissing = missing.filter((m) => m.severity === 'HIGH');
const coverage = ((present.length / REQUIRED.length) * 100).toFixed(1);

const result = {
  summaryPath: SUMMARY_PATH,
  totalRequired: REQUIRED.length,
  present: present.length,
  missing: missing.length,
  coveragePercent: Number(coverage),
  highSeverityMissing: highMissing.length,
  missingDetails: missing,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`[coverage] ${SUMMARY_PATH}`);
  console.log(`[coverage] ${present.length}/${REQUIRED.length} required tokens present (${coverage}%)`);
  if (missing.length > 0) {
    console.log('[coverage] Missing:');
    for (const m of missing) {
      console.log(`  - [${m.severity}] ${m.label}  (token: ${m.token})`);
    }
  }
}

// CI gate: any HIGH-severity miss fails the build.
if (highMissing.length > 0) {
  console.error(`[coverage] FAIL: ${highMissing.length} HIGH-severity rules missing from summary.`);
  process.exit(1);
}
process.exit(0);
