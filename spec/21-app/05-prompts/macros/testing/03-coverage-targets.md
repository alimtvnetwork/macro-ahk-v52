# Coverage Targets

Enforced by Vitest `coverage.thresholds` (per-module) in `vitest.config.ts`. CI fails the build below threshold (no override).

## Thresholds

| Module path | Lines | Branches | Functions | Statements |
|-------------|------:|---------:|----------:|-----------:|
| `src/prompts/engine/runner.ts` | 95 | 90 | 100 | 95 |
| `src/prompts/engine/state-store.ts` | 95 | 90 | 100 | 95 |
| `src/prompts/engine/interpolator.ts` | 100 | 100 | 100 | 100 |
| `src/prompts/engine/score-parser.ts` | 100 | 100 | 100 | 100 |
| `src/prompts/engine/audit-writer.ts` | 95 | 90 | 100 | 95 |
| `src/prompts/engine/watchdog.ts` | 95 | 90 | 100 | 95 |
| `src/prompts/engine/message-bus.ts` | 90 | 85 | 100 | 90 |
| `src/prompts/engine/event-stream.ts` | 95 | 90 | 100 | 95 |
| `src/prompts/json/**` | 95 | 90 | 100 | 95 |
| `src/prompts/json/migrators/**` | 100 | 100 | 100 | 100 |
| `src/prompts/ui/**` | 80 | 70 | 90 | 80 |

Rationale: pure modules (interpolator, score-parser, migrators) are 100% — small surface, high blast radius. UI lower because rendering branches are covered by component tests + E2E.

## Excluded
- `src/prompts/ui/icons/**` (static SVG modules)
- `**/*.d.ts`
- `**/index.ts` re-export barrels

## Reports
- HTML report: `coverage/html/` (gitignored).
- LCOV: `coverage/lcov.info` — uploaded as CI artifact only; no third-party telemetry (per No-CI-notifications).

## Mutation testing
- Out of scope for v1.0.0. Tracked as a follow-up under `plan.md`.
