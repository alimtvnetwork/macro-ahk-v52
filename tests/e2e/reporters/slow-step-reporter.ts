import type { Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter';

/**
 * SlowStepReporter
 *
 * Flags any Playwright test step (action, expect, hook) whose duration
 * exceeds a configurable threshold (default 60_000 ms, overridable via
 * the SLOW_STEP_THRESHOLD_MS env var).
 *
 * Designed to pair with the extended-timeout CI job for E2E-02 so that
 * when a test no longer fails outright, we can still see WHICH step
 * inside it is creeping past the original 60 s budget.
 *
 * Output:
 *   - Per-test inline log of every offending step (file:line, title, ms)
 *   - End-of-run summary table
 *   - GitHub Actions ::warning:: annotations when running in CI
 */
const THRESHOLD_MS = Number(process.env.SLOW_STEP_THRESHOLD_MS ?? 60_000);

interface SlowEntry {
  testTitle: string;
  testFile: string;
  stepTitle: string;
  category: string;
  durationMs: number;
}

class SlowStepReporter implements Reporter {
  private readonly slowEntries: SlowEntry[] = [];

  onStepEnd(test: TestCase, _result: TestResult, step: TestStep): void {
    if (step.duration < THRESHOLD_MS) return;
    // Skip the synthetic root step that wraps the whole test.
    if (!step.parent && step.category === 'test.step') return;

    const entry: SlowEntry = {
      testTitle: test.titlePath().slice(1).join(' › '),
      testFile: test.location?.file ?? 'unknown',
      stepTitle: step.title || '(unnamed step)',
      category: step.category,
      durationMs: Math.round(step.duration),
    };
    this.slowEntries.push(entry);

    const line = `⏱  SLOW STEP (${entry.durationMs}ms ≥ ${THRESHOLD_MS}ms) — [${entry.category}] "${entry.stepTitle}" in ${entry.testTitle}`;
    process.stdout.write(`\n${line}\n`);

    if (process.env.CI === 'true') {
      const file = entry.testFile;
      const ln = test.location?.line ?? 1;
      process.stdout.write(`::warning file=${file},line=${ln}::${line}\n`);
    }
  }

  onEnd(): void {
    if (this.slowEntries.length === 0) {
      process.stdout.write(`\n✓ [slow-step-reporter] No steps exceeded ${THRESHOLD_MS}ms.\n`);
      return;
    }
    process.stdout.write(
      `\n──────── [slow-step-reporter] ${this.slowEntries.length} step(s) exceeded ${THRESHOLD_MS}ms ────────\n`,
    );
    for (const e of this.slowEntries) {
      process.stdout.write(`  • ${e.durationMs}ms  [${e.category}]  ${e.stepTitle}\n      ↳ ${e.testTitle}\n`);
    }
    process.stdout.write('────────────────────────────────────────────────────────────────────\n');
  }
}

export default SlowStepReporter;
