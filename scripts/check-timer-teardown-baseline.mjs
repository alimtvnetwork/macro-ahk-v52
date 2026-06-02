#!/usr/bin/env node
/**
 * Regression lock for the timer-teardown audit.
 *
 * Compares the live audit count against the frozen baseline. The count
 * MUST be ≤ baseline. Lowering it (by remediating files) is allowed and
 * encouraged. Growing it fails CI — the new install needs a paired
 * teardown before it can land.
 */

import { readFileSync } from 'node:fs';

const live = JSON.parse(readFileSync('public/timer-teardown-audit.json', 'utf8'));
const baseline = JSON.parse(readFileSync('public/timer-teardown-audit.baseline.json', 'utf8'));

if (live.totalFindings > baseline.totalFindings) {
    console.error(
        `timer-teardown regression: live=${live.totalFindings} > baseline=${baseline.totalFindings}. ` +
        `Add paired teardown (clearTimeout/clearInterval/.disconnect()/removeEventListener) to the new install.`,
    );
    process.exit(1);
}

if (live.totalFindings < baseline.totalFindings) {
    console.log(
        `timer-teardown improved: live=${live.totalFindings} < baseline=${baseline.totalFindings}. ` +
        `Lower public/timer-teardown-audit.baseline.json to ${live.totalFindings} to lock the win.`,
    );
} else {
    console.log(`timer-teardown: holding at baseline (${live.totalFindings}).`);
}
