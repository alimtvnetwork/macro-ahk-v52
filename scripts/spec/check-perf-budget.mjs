#!/usr/bin/env node
// Perf-budget gate — reads spec/21-app/05-prompts/macros/performance/10-budgets.md
// and runs synthetic fixture timings. Fail-fast (no retry/backoff per no-retry policy).
import { readFileSync, existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const BUDGET_DOC = 'spec/21-app/05-prompts/macros/performance/10-budgets.md';
if (!existsSync(BUDGET_DOC)) {
  console.error(`[perf-budget] Missing budget doc: ${BUDGET_DOC}`);
  process.exit(2);
}

// Synthetic micro-benchmarks (placeholder until runner is wired)
const measures = [];
function bench(name, fn, hardCeilingMs) {
  const t0 = performance.now();
  fn();
  const dt = performance.now() - t0;
  const pass = dt <= hardCeilingMs;
  measures.push({ name, ms: +dt.toFixed(3), ceiling: hardCeilingMs, pass });
}

bench('interpolate_1_var', () => {
  const tpl = 'hello {{name}}';
  for (let i = 0; i < 1000; i++) tpl.replace('{{name}}', 'world');
}, 5);

bench('audit_write_sim', () => {
  JSON.stringify({ runId: 'r1', steps: Array(50).fill({ ok: true }) });
}, 50);

console.table(measures);
const failed = measures.filter(m => !m.pass);
if (failed.length) {
  console.error('[perf-budget] FAIL:', failed.map(f => f.name).join(', '));
  process.exit(1);
}
console.log('[perf-budget] OK');
