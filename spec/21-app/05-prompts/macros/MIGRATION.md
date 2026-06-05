# Prompt Macros — MIGRATION
How to migrate an existing single-shot prompt under `standalone-scripts/prompts/` into a **macro-prompt** under `standalone-scripts/macro-prompts/`.
> Times in **the user's local timezone**. No Supabase. No retry. No light theme.
## When to migrate
Migrate when the prompt:
- Needs to be re-issued more than once in a session, OR
- Should chain into an audit/fix loop, OR
- Should accept user-supplied variables at run-time.
Keep it under `standalone-scripts/prompts/` otherwise — single-shot prompts stay single-shot.
## Steps (in order — fail-fast)
### 1. Move the file
```
standalone-scripts/prompts/<slug>.md
    →
standalone-scripts/macro-prompts/<slug>/body.md
```
Folder name MUST equal the slug (CI guard `DuplicateMacroSlug` / `SlugFolderMismatch`).
### 2. Add `info.json`
```json
{
  "Slug": "<slug>",
  "Title": "<Human title>",
  "Variables": [
    { "Name": "TargetFolder", "Type": "string", "Default": "spec/" }
  ],
  "TargetScore": 95,
  "MaxLoops": 5
}
```
Validate against `schemas/macro-definition.schema.json` before committing.
### 3. Add `steps.json` (or inline `Steps[]` in `info.json` for ≤3 steps)
```json
[
  { "Kind": "prompt",      "PromptSlug": "<slug>" },
  { "Kind": "next-loop",   "Count": 3 },
  { "Kind": "final-audit", "WriteTo": "spec/audit/{{ RunId }}/99-final-report.md" }
]
```
### 4. Replace hard-coded values with `{{ VarName }}`
Inside `body.md`:
```diff
- Audit folder spec/ to depth 3.
+ Audit folder {{ TargetFolder }} to depth {{ Depth }}.
```
Every `{{ VarName }}` MUST appear in `info.json.Variables[]` — otherwise build fails with `Reason='UndeclaredVariable'`.
### 5. Rebuild the aggregator
```
node standalone-scripts/build-macro-prompts.mjs
```
Confirms `src/generated/macro-prompts.ts` now exports `<slug>` and `public/macro-prompts.manifest.json` lists it.
### 6. Add a fixture
`standalone-scripts/macro-prompts/<slug>/__tests__/<slug>.spec.ts` — at minimum, assert the macro loads, variables interpolate, and one happy-path run terminates.
### 7. Remove the legacy file
Delete `standalone-scripts/prompts/<slug>.md`. CI guard `OrphanedLegacyPrompt` enforces no duplicates.
## Reverse migration
Demote macro → single-shot: delete the folder, restore `<slug>.md` under `prompts/`, re-run aggregator. No state to clean — macros are stateless between runs (only `_log.jsonl` persists, under `spec/audit/<runId>/`).
## Breaking changes from prompt-only era
| Before | After |
|--------|-------|
| Prompt = single Markdown file | Macro = folder with `info.json` + `body.md` + `steps.json` |
| Inject once into chatbox | Engine drives chained steps |
| No variables | `{{ VarName }}` with 5-tier resolution |
| No audit output | Writes `spec/audit/<runId>/` |
## Spec version migration (1.0 → 2.0)
The 50-step blind-AI upgrade on 2026-06-02 is **additive only** — no breaking
changes to schemas, storage keys, message contracts, or UI behavior. All v1
macros continue to load and run unchanged.
What changed:
- 47 new spec docs (pseudo-code, matrices, schemas, walkthroughs, inventories).
- 2 new memory files (`mem://features/prompt-macros`, `mem://features/prompt-variables`).
- New canonical scorecard: `macros/readiness-score-v2.md` supersedes v1.
What did NOT change:
- All `StepKindId` values (1–8) and their semantics.
- The 5-tier variable resolution waterfall.
- `chrome.storage.local` keys.
- The `Score: NN / 100` regex.
- The `MacroEvent` union shape (additions go through schema versioning).
Implementers who already shipped against v1 need do nothing. New
implementations SHOULD start from `IMPLEMENTATION-CHECKLIST.md`.
