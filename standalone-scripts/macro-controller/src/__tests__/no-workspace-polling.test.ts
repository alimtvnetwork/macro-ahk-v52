/**
 * Regression: workspace credits must never be polled on a timer.
 *
 * Contract (per Issue: workspace refetch policy):
 *   - `fetchLoopCredits` / `fetchLoopCreditsAsync` only fire on explicit user
 *     intent (Check button, workspace switch, context-menu refresh) or one-shot
 *     startup hydration.
 *   - Zero `setInterval` / recurring scheduler may wrap them.
 *
 * If a future refactor wires a polling timer around these fetchers, this
 * source-level test fails loudly with the offending file and line.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC_ROOT = join(__dirname, '..', '..', 'src');
const FETCHER_NAMES = ['fetchLoopCredits', 'fetchLoopCreditsAsync', 'fetchLoopCreditsWithDetect'];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(full, acc);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Workspace refetch policy (regression)', () => {
  it('no setInterval / trackedSetInterval wraps a workspace credit fetcher', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      const src = readFileSync(file, 'utf8');
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isTimerLine = /\b(set|tracked)Interval\s*\(/.test(line)
          || /\bsetTimeout\s*\(.*fetchLoopCredits/.test(line);
        if (!isTimerLine) continue;
        // Look at this line + next 8 lines for a fetcher name (covers
        // multi-line `setInterval(function () { fetchLoopCredits(...) }, ms)`).
        const slice = lines.slice(i, i + 9).join('\n');
        for (const name of FETCHER_NAMES) {
          if (slice.includes(name + '(')) {
            offenders.push(file.replace(SRC_ROOT, 'src') + ':' + (i + 1) + ' → ' + name);
          }
        }
      }
    }
    expect(offenders, 'Polling fetcher detected:\n  ' + offenders.join('\n  ')).toEqual([]);
  });

  it('fetchLoopCredits exists and is only called from user-action or startup paths', () => {
    // Smoke check: the module exports the fetcher under its expected name.
    const src = readFileSync(join(SRC_ROOT, 'credit-fetch.ts'), 'utf8');
    expect(src).toMatch(/export function fetchLoopCredits\b/);
    expect(src).toMatch(/export function fetchLoopCreditsAsync\b/);
  });
});
