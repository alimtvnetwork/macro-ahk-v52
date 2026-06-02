# Worked Example — Variable-Driven Audit

## Goal
Reuse a single macro to audit multiple spec folders by supplying different `SpecRoot` values via RunContext — no macro duplication.

## Macro under test
`spec-tighten-cycle` (see `00-spec-tighten-cycle.md`). Variable `SpecRoot` is declared at macro level with no default → must be supplied at Start.

## Invocation A — audit `spec/21-app`
1. Open Prompts panel → Macros tab → click **Run** on `spec-tighten-cycle`.
2. Variable Input Dialog appears (only `SpecRoot` is unfilled).
3. Enter `spec/21-app` → Submit.
4. Run proceeds; audit folder: `spec/audit/<RunId-A>/`.

## Invocation B — audit `spec/30-import-export`
1. Same macro, click **Run** again (from same or different tab).
2. Enter `spec/30-import-export` → Submit.
3. Separate audit folder: `spec/audit/<RunId-B>/`.

## Cross-cutting assertions
- [ ] Both runs use **identical** macro JSON (same `Checksum` in `_meta.json`).
- [ ] `variables-snapshot.json` differs only in `SpecRoot.resolvedValue` and `source: "RunContext"`.
- [ ] No shared mutable state between runs (per-tab `MacroRun.Active.<TabId>` pointers are independent).
- [ ] If both runs target the **same** tab, the second is rejected with `Reason='TabBusy'` (see concurrency spec).
- [ ] If launched from different tabs, both run in parallel; SQLite writes serialize through `MacroEngineWriteLock`.

## Failure path
- Submit Variable Dialog with empty `SpecRoot` → form validation blocks Submit (required field).
- Provide path outside repo root (`/etc/passwd`) → step 0's path-traversal guard fires → `Reason='PathOutsideRoot'`, `ReasonDetail` = absolute path.

## Authoring takeaway
Adding a third audit target requires **zero** macro edits — just a new Start with a different `SpecRoot`. This proves the macro is parameterized correctly per `variables/00-overview.md`.
