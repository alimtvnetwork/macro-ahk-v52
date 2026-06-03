# Tasks 1–20 — Planning the next 100 tasks (T21–T120)

**Total tasks in this spec:** 120
**Tasks 1–20:** plan the work (this file is the deliverable for T1–T20).
**Tasks 21–120:** execute the plan, 5 tasks per planning step below.

Each planning step describes **exactly 5 follow-up tasks** so that the
user's `next ten steps` command (executed twice per planning chunk) maps
cleanly onto the chunks below.

Conventions used in every follow-up section that will be written later:

- Every host-site DOM target appears as `???` with a `<!-- HOST: ... -->`
  hint.
- Every persistence call appears as an interface method (e.g.
  `store.savePrompt(p)`) — never as a concrete API.
- Every code sample is framework-agnostic TypeScript.
- No reference to `MacroController`, `Marco SDK`, or this project's file
  paths.

---

## Step 1 — Tasks 21–25 · Glossary & scope guard
**Folder:** `01-glossary/`
- T21 `01-terms.md` — Prompt, PromptCategory, PromptStore, ChatBox, NextLoop, PlanLoop, Queue, HostApp, Integrator definitions.
- T22 `02-actors.md` — End user, Integrator, AI model consuming the spec.
- T23 `03-non-goals.md` — Explicitly out of scope: auth, billing, telemetry transport, prompt versioning UI.
- T24 `04-vocabulary-banlist.md` — Forbidden words (MacroController, chrome.*, RiseupAsia*) with rationale.
- T25 `05-scope-diagram.mmd` — Mermaid diagram of HostApp ⇄ PromptsFeature ⇄ ChatBox boundary.

## Step 2 — Tasks 26–30 · Generic data model
**Folder:** `02-data-model/`
- T26 `01-prompt.md` — `Prompt { id, title, slug, version, author, categories[], body, isDefault, order, createdAt, updatedAt }`.
- T27 `02-category.md` — `PromptCategory { slug, label, order }` + free-tag fallback.
- T28 `03-store-interface.md` — `PromptStore` interface (list / get / save / delete / import / export).
- T29 `04-id-and-slug-rules.md` — Slug regex, collision policy, id-vs-slug separation.
- T30 `05-json-schema.md` — JSON Schema for `Prompt` + `PromptCategory` (pure JSON, no PascalCase mandate — leave to integrator).

## Step 3 — Tasks 31–35 · On-disk prompt source format
**Folder:** `03-prompt-source-format/`
- T31 `01-folder-layout.md` — `prompts/<NN>-<slug>/{info.json, prompt.md}` (mirrors the read-only `standalone-scripts/prompts/` reference corpus).
- T32 `02-info-json.md` — Required and optional fields; example file.
- T33 `03-prompt-md.md` — Markdown body conventions, variable placeholders `{{var}}`.
- T34 `04-default-vs-user-prompts.md` — Shipped defaults vs user-created; merge precedence.
- T35 `05-import-export-zip.md` — Round-trip zip format.

## Step 4 — Tasks 36–40 · Loader contract
**Folder:** `04-loader-contract/`
- T36 `01-loader-interface.md` — `loadPrompts(): Promise<Prompt[]>` contract.
- T37 `02-cache-rules.md` — Cache key, invalidation triggers, manual reload.
- T38 `03-variable-resolution.md` — `{{date}}`, `{{selection}}`, `{{cursor}}`, custom vars; resolution order.
- T39 `04-error-modes.md` — Loader error taxonomy (NotFound / Parse / Schema / Network).
- T40 `05-lifecycle-diagram.mmd` — Load → cache → render → invalidate flow.

## Step 5 — Tasks 41–45 · UI surface contract
**Folder:** `05-ui-contract/`
- T41 `01-trigger.md` — Where the dropdown opens from (host decides: floating button, keyboard shortcut, slash-command).
- T42 `02-dropdown-shape.md` — Required sections (Task-Next entry first, category chips, search box, prompt list, footer actions).
- T43 `03-search-filter.md` — Match against title + slug + body.
- T44 `04-keyboard.md` — Arrow keys, Enter to inject, Esc to close.
- T45 `05-accessibility.md` — ARIA roles, focus management, reduced-motion.

## Step 6 — Tasks 46–50 · Injection contract (paste into chat-box)
**Folder:** `06-injection-contract/`
- T46 `01-target-resolution.md` — Host supplies **Q1** chat-box XPath `???` (`<!-- HOST: paste target -->`).
- T47 `02-paste-strategies.md` — `execCommand('insertText')`, `InputEvent`, framework dispatch; pick by editor kind (**Q4**).
- T48 `03-cursor-and-selection.md` — Append vs replace vs at-cursor.
- T49 `04-paste-verification.md` — Read-back assertion that text landed; retry policy (fail-fast, no exponential backoff).
- T50 `05-paste-toast.md` — Optional user feedback contract.

## Step 7 — Tasks 51–55 · Editor adapter abstraction
**Folder:** `06-injection-contract/adapters/`
- T51 `01-textarea-adapter.md`
- T52 `02-contenteditable-adapter.md`
- T53 `03-prosemirror-adapter.md`
- T54 `04-lexical-adapter.md`
- T55 `05-monaco-adapter.md`
Each adapter has the same `paste(text, mode)` signature.

## Step 8 — Tasks 56–60 · Save / create / edit / import / export
**Folder:** `70-save-create-edit/`
- T56 `01-create-flow.md` — Modal fields, slug auto-gen, save to `PromptStore`.
- T57 `02-edit-flow.md` — Load existing, diff, save.
- T58 `03-delete-flow.md` — Soft-delete vs hard, restore window.
- T59 `04-import-flow.md` — Accept zip / single JSON / paste-from-clipboard.
- T60 `05-export-flow.md` — Single / multi / all-as-zip.

## Step 9 — Tasks 61–65 · Next-button automation overview
**Folder:** `80-next-automation/`
- T61 `01-overview.md` — One paragraph + sequence diagram.
- T62 `02-host-submit-button.md` — **Q2** XPath `???` for submit button (`<!-- HOST: submit / Add-to-Tasks button -->`).
- T63 `03-disabled-button-handling.md` — Retry-once-after-readiness-check (no backoff loop) policy.
- T64 `04-interruption-detection.md` — **Q3** "return-to-chat" banner XPath `???` (`<!-- HOST: interruption banner -->`).
- T65 `05-cancel.md` — Esc / dedicated stop button cancels remaining queue items.

## Step 10 — Tasks 66–70 · Queue model
**Folder:** `90-queue-engine/`
- T66 `01-task-shape.md` — `QueuedTask { id, kind, body, status, retryCount, holdUntil?, createdAt }`.
- T67 `02-statuses.md` — `pending | processing | hold | completed | failed`.
- T68 `03-store-interface.md` — `QueueStore` interface (in-memory default, optional persistence).
- T69 `04-capacity.md` — **Q7** max 999, configurable.
- T70 `05-ordering.md` — FIFO; explicit reorder API for UI drag.

## Step 11 — Tasks 71–75 · Queue lifecycle
**Folder:** `90-queue-engine/lifecycle/`
- T71 `01-enqueue.md` — Single + bulk (N copies for Next-mode).
- T72 `02-process-tick.md` — Single async loop, one task at a time.
- T73 `03-retry-and-hold.md` — Bounded retry, fail-fast policy (no exponential backoff, per project hard rule).
- T74 `04-cancel-and-pause.md`
- T75 `05-completion-events.md` — Observer contract (`onTaskCompleted`, `onQueueDrained`).

## Step 12 — Tasks 76–80 · Delay engine
**Folder:** `90-queue-engine/delay/`
- T76 `01-default.md` — **Q6** 5–10s window, default 7s.
- T77 `02-settings.md` — Per-mode override (Next vs Plan).
- T78 `03-jitter.md` — Optional ±20 % jitter.
- T79 `04-skip-first.md` — Whether the first task delays or runs immediately.
- T80 `05-pause-during-delay.md` — Pause must interrupt sleeping timer.

## Step 13 — Tasks 81–85 · Failure detection
**Folder:** `100-failure-handling/`
- T81 `01-categories.md` — Logged-out (**Q5**), submit-disabled, navigation, paste-rejected, unknown.
- T82 `02-detection-hooks.md` — Cookie probe, DOM observer, network 401 listener.
- T83 `03-user-feedback.md` — Toast + queue status badge.
- T84 `04-recovery.md` — Single re-check, then mark `failed` + stop.
- T85 `05-mandatory-failure-log.md` — Per project rule: Reason + ReasonDetail + SelectorAttempts[] + VariableContext[].

## Step 14 — Tasks 86–90 · Plan mode
**Folder:** `110-plan-mode/`
- T86 `01-overview.md` — Same queue engine, different prompt template + count.
- T87 `02-plan-prompt-template.md` — Variable slots (`{{planCount}}`, `{{currentStep}}`).
- T88 `03-ui-entry.md` — Sub-menu mirrors Next-tasks sub-menu (1, 2, 3, 5, 10, 20, 30, 40, custom).
- T89 `04-interaction-with-next.md` — Mutually exclusive vs cooperative modes.
- T90 `05-acceptance.md` — Plan-mode-specific acceptance bullets.

## Step 15 — Tasks 91–95 · Settings & persistence
**Folder:** `120-settings/`
- T91 `01-schema.md` — `{ delaySeconds, jitterPercent, maxRetries, pauseOnError, mode, chatBoxXPath, submitXPath, interruptionXPath, editorKind }`.
- T92 `02-defaults.md` — Documented default values.
- T93 `03-storage-backend.md` — **Q8** localStorage default; pluggable.
- T94 `04-migration.md` — Versioned settings + migration hook.
- T95 `05-settings-ui.md` — Minimal form shape.

## Step 16 — Tasks 96–100 · Observability
**Folder:** `130-observability/`
- T96 `01-log-events.md` — Lifecycle events (`queue.enqueued`, `task.started`, `task.completed`, …).
- T97 `02-log-shape.md` — Reason + ReasonDetail mandatory on failures.
- T98 `03-export.md` — JSON download bundle format.
- T99 `04-redaction.md` — Mask sensitive variables (auto-detect password/token slugs).
- T100 `05-verbose-toggle.md` — Off by default; on persists full prompt body.

## Step 17 — Tasks 101–105 · Integration onboarding
**Folder:** `140-integration-onboarding/`
- T101 `01-questionnaire.md` — Master list of `???` answers integrator must supply (Q1–Q8 from overview).
- T102 `02-discovery-recipes.md` — How to find each XPath using browser devtools.
- T103 `03-self-test.md` — Smoke checklist after wiring.
- T104 `04-troubleshooting.md` — Common selector-drift failures.
- T105 `05-host-app-sample.md` — Walk-through using a generic chat app (no Lovable references).

## Step 18 — Tasks 106–110 · Test plan
**Folder:** `150-test-plan/`
- T106 `01-unit.md` — Loader, store, queue, delay engine.
- T107 `02-integration.md` — Adapter + injection round-trip per editor kind.
- T108 `03-e2e.md` — Full Next-loop with mocked host.
- T109 `04-acceptance-criteria.md` — Bulleted, copy-pastable.
- T110 `05-test-fixtures.md` — Fixture prompt set drawn from `standalone-scripts/prompts/`.

## Step 19 — Tasks 111–115 · Reference snippets
**Folder:** `160-reference-snippets/`
- T111 `01-prompt-store-in-memory.ts.md` — ~40 lines.
- T112 `02-queue-engine.ts.md` — ~80 lines.
- T113 `03-textarea-adapter.ts.md`
- T114 `04-contenteditable-adapter.ts.md`
- T115 `05-next-loop-orchestrator.ts.md`

All snippets are pseudo-code in fenced TS blocks; no imports from this repo.

## Step 20 — Tasks 116–120 · Adoption checklist & worked example
**Folder:** `170-adoption-checklist/`
- T116 `01-pre-flight.md` — Confirm Q1–Q8 answered.
- T117 `02-wire-up-order.md` — Recommended task order (data-model → loader → UI → injection → queue → Next → Plan).
- T118 `03-go-live-checklist.md`
- T119 `04-worked-example.md` — End-to-end "ship Prompts to a fictional support-chat web app".
- T120 `05-handoff.md` — Summary for the next AI model: where to start reading.

---

## Cadence

User has agreed to drive execution with `next ten steps` messages. Each
`next ten steps` covers **two** of the 20 planning steps above (= 10
spec tasks). Expect 10 such follow-up turns to land tasks 21–120.

## Tracking

Each completed follow-up task increments a checkbox here:

- [x] T21–T25  Glossary  *(2026-06-02)*
- [x] T26–T30  Data model  *(2026-06-02)*
- [x] T31–T35  On-disk format  *(2026-06-02)*
- [x] T36–T40  Loader  *(2026-06-02)*
- [x] T41–T45  UI  *(2026-06-02)*
- [x] T46–T50  Injection  *(2026-06-02)*
- [x] T51–T55  Editor adapters
- [x] T56–T60  Save/create/edit
- [x] T61–T65  Next overview  *(2026-06-02)*
- [x] T66–T70  Queue model  *(2026-06-02)*
- [x] T71–T75  Queue lifecycle  *(2026-06-02)*
- [x] T76–T80  Delay engine  *(2026-06-02)*
- [x] T81–T85  Failure handling  *(2026-06-02)*
- [x] T86–T90  Plan mode  *(2026-06-02)*
- [x] T91–T95  Settings  *(2026-06-02)*
- [x] T96–T100 Observability  *(2026-06-02)*
- [x] T101–T105 Onboarding  *(2026-06-02)*
- [x] T106–T110 Test plan  *(2026-06-02)*
- [x] T111–T115 Reference snippets  *(2026-06-02)*
- [x] T116–T120 Adoption checklist  *(2026-06-02)*
