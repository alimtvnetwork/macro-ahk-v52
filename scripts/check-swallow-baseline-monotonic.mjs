#!/usr/bin/env node
// S91 — Baseline-monotonic guard.
// The error-swallow baseline must shrink or stay equal — never grow.
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BASELINE = 'scripts/baselines/swallow-baseline.json';
if (!existsSync(BASELINE)) {
  console.log('no baseline file; skipping monotonic check');
  process.exit(0);
}

const current = JSON.parse(readFileSync(BASELINE, 'utf8'));
const currentCount = Array.isArray(current) ? current.length : (current.entries?.length ?? 0);

let prevCount = currentCount;
try {
  const prev = execSync(`git show HEAD:${BASELINE} 2>/dev/null`, { encoding: 'utf8' });
  const parsed = JSON.parse(prev);
  prevCount = Array.isArray(parsed) ? parsed.length : (parsed.entries?.length ?? 0);
} catch {
  console.log('no previous baseline in git; allowing');
  process.exit(0);
}

if (currentCount > prevCount) {
  console.error(`::error::swallow baseline grew: ${prevCount} → ${currentCount}. Baseline must be monotonic-decreasing.`);
  process.exit(1);
}
console.log(`baseline monotonic OK (${prevCount} → ${currentCount})`);
