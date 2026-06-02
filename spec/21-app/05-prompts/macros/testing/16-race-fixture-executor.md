# Race Fixture Executor — Spec

Status: Normative · v1.0.0 · 2026-06-02
Companion to: `macros/testing/15-race-fixture-pack.md`, `fixtures/race/r0?.json`

## Goal
A single deterministic driver that consumes any `fixtures/race/r0X.json` and
asserts the `expect` block against a simulated runner.

## Contract
```ts
runRaceFixture(fixturePath: string): RaceResult
type RaceResult = {
  fixtureId: string;
  passed: boolean;
  expected: object;
  actual: object;
  reasonCode?: string | null;
  diff?: string[];
}
```

## Inputs
- Fixture JSON with `id`, `spec` (back-ref), `macro` or `setup`, `actions[]`, `expect{}`.

## Behavior
1. Load + JSON-schema-validate fixture (reuse `json/10`+`11` schemas).
2. Build a stubbed `Runner` with injectable clock (no real `setTimeout`).
3. Replay `actions[]` in order, advancing the clock as scheduled.
4. Snapshot final state.
5. Deep-compare against `expect{}`; collect path-level diffs.
6. Return `RaceResult`; throw nothing (failures surfaced via `passed=false`).
7. Fail-fast: no retry, no re-run.

## CLI
```bash
node scripts/spec/run-race-fixture.mjs spec/21-app/05-prompts/macros/testing/fixtures/race/r01-stop-during-dispatch.json
# Exit 0 = pass; 1 = mismatch; 2 = missing/invalid fixture
```

## Wiring (deferred to v8)
- vitest harness: `test.each(fixtures)('race %s', (f) => expect(runRaceFixture(f).passed).toBe(true))`
- CI: add `race-fixtures` job to `spec-gates.yml`

## Logging
On mismatch:
- `Reason: 'RaceExpectationMismatch'`
- `ReasonDetail`: comma-joined diff paths
- Full `expected` + `actual` JSON (verbose-gated under verbose toggle).
- Code Red logging applies: include exact fixture path + missing key.
