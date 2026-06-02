# E2E Tests

Location: `tests/e2e/prompts/`. Runner: Playwright with a packed `dist/` extension loaded into Chromium via `chromium.launchPersistentContext`.

## Scenarios

| # | File | Scenario |
|---|------|----------|
| 1 | `run-macro.spec.ts` | Open panel → Macros tab → Run `spec-tighten-cycle` → fill VariableInputDialog → assert RunFinished with Score >= TargetScore |
| 2 | `pause-resume.spec.ts` | Start macro → Pause mid-step → assert `RunPaused` event + UI banner → Resume → completes |
| 3 | `sw-restart-resume.spec.ts` | Start macro → kill SW via `chrome.runtime.reload()` proxy → assert rehydration: stale > 90s → `RunFailed Reason=SwRestartStale`; fresh < 90s → resumes |
| 4 | `loop-if-branch.spec.ts` | Macro with `LoopIf` → first iter `score=78` → second iter `score=96` → assert `LoopEntered` count=1, terminal `FinalScore=96` |
| 5 | `replace-via-json.spec.ts` | Drag-drop `bundle-A.json` → type `REPLACE` → confirm → assert row counts + Restore-previous flow |
| 6 | `variable-dialog.spec.ts` | Macro with 1 required + 2 optional vars → Submit blocked until required filled; Enum widget rejects out-of-list value; Sensitive field masks |
| 7 | `concurrency-tab-busy.spec.ts` | Start macro in Tab A → attempt Start in Tab A → assert `Reason=TabBusy` banner + "Stop & start" button; same macro in Tab B starts in parallel |
| 8 | `new-tab-guard.spec.ts` | Open `chrome://newtab/` → Run macro → assert refusal with `Reason=NewTabGuard` |

## Fixtures
- `tests/fixtures/bundles/bundle-A.json` (Profile A snapshot from example 02).
- `tests/fixtures/macros/*.macro.json` (canonical macros from example 04).

## Determinism rules
- Each spec creates a fresh persistent profile dir under `tests/.profiles/<runId>/`; deleted on success.
- Network calls to LLM API mocked via Playwright route interception; canned responses end with `score: NN/100`.
- Asia/Kuala_Lumpur timezone fixed via `TZ=Asia/Kuala_Lumpur` env.
- No `sleep` — use `expect.poll()` with explicit conditions.

## Failure capture
- On any spec failure: capture `spec/audit/<RunId>/` tree + Playwright trace + screenshot to `tests/.artifacts/<spec>/`.
- CI uploads the artifact dir on failure (no email/notification — per Core).

## Manual Chrome E2E
Per `mem://preferences/deferred-workstreams` (lifted 2026-05-25), manual Chrome smoke runs are also allowed; documented in `tests/e2e/prompts/MANUAL.md` checklist.
