# 58 — 2026 Prompts Generic Spec — scope & placeholders

**Date (KL):** 2026-06-02
**Trigger:** User asked to create a `2026` spec folder containing a
fully generic re-spec of the Prompts feature (prompts library + Next
loop + Plan loop), with all host-site XPaths left as `???` so any AI
model can integrate it into any other app. First 20 tasks = plan;
total 120 tasks; user will drive execution with `next ten steps`.

## Ambiguities resolved without asking (No-Questions Mode active)

| # | Ambiguity | Options | Chosen | Why |
|---|---|---|---|---|
| A1 | Spec folder name | `spec/2026-…` / `spec/27-prompts-generic` / `spec/2026-prompts-generic` | **`spec/2026-prompts-generic`** | Matches user's literal "2026 spec" phrasing; avoids colliding with numeric series (26 is taken by `26-chrome-extension-generic`). Reversible via `git mv`. |
| A2 | Where the "first 20 steps" live | Single file vs 20 separate files | **Single `01-plan-tasks-1-20.md`** | User said "write what you do in the next 100 tasks" — that is a plan document, not 20 deliverables. |
| A3 | Mapping `next ten steps` → tasks | 10 spec tasks per turn vs 10 planning steps per turn | **10 spec tasks per turn (= 2 planning steps)** | "Next ten steps" reads naturally as 10 actual tasks; 100 remaining / 10 = 10 turns to finish, clean cadence. |
| A4 | XPath placeholders | Invent generic selectors vs leave blank vs `???` with HOST comment | **`???` + `<!-- HOST: … -->` comment** | User explicitly said "put those XPaths as question marks". |
| A5 | Default delay between Next-loop tasks | 5s, 7s, 10s | **7s default, 5–10s configurable range** | User said "usually 5 seconds, 10 seconds" → midpoint as default, both endpoints documented. |
| A6 | Persistence backend in the generic spec | mandate one vs leave open | **Interface only (`PromptStore`, `QueueStore`, `SettingsStore`)** with localStorage as the documented default | User stressed "as generic as possible". |
| A7 | Whether to copy `standalone-scripts/prompts/**` into the spec | copy / symlink / reference | **Reference by path only** (read-only) | Prevents drift; keeps spec lean; matches "skipped/.release read-only folders" memory pattern. |
| A8 | Banned vocabulary list | implicit vs explicit | **Explicit `04-vocabulary-banlist.md`** (Task 24) | User said "should never have macro controller code" — codify it as a lint-grade rule inside the spec. |

## Deferred to host integrator (collected in `140-integration-onboarding/`)

Q1 chat-box XPath, Q2 submit-button XPath, Q3 interruption-banner XPath,
Q4 editor kind, Q5 logged-out signal, Q6 delay seconds, Q7 max queue
size, Q8 persistence backend. All marked `???` in spec; integrator
fills via the onboarding questionnaire.

## Status

Tasks 1–20 (planning) **complete** in this turn.
Tasks 21–120 awaiting user-driven `next ten steps` cadence (10 turns).
