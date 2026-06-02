#!/usr/bin/env node
// S85 — Readiness-report enforcement (advisory pre-commit helper).
// Checks staged changes for new feature files and warns if no matching
// readiness-report markdown is staged in the same commit.
import { execSync } from 'node:child_process';

let staged = '';
try {
  staged = execSync('git diff --cached --name-status', { encoding: 'utf8' });
} catch {
  process.exit(0);
}
const lines = staged.trim().split('\n').filter(Boolean);
const newFeatures = lines.filter((l) => l.startsWith('A\t') && /^A\tsrc\/.+\.(ts|tsx)$/.test(l));
const hasReadiness = lines.some((l) => /readiness-report.*\.md$/i.test(l));

if (newFeatures.length > 0 && !hasReadiness) {
  console.warn('\n  ⚠ readiness-report not staged.');
  console.warn('  New feature files detected:');
  for (const l of newFeatures.slice(0, 5)) console.warn('    ' + l.slice(2));
  console.warn('  Add a readiness-report markdown (see mem://workflow/readiness-reports).\n');
}
