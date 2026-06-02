# 2026 Prompts Feature — Generic Spec

**Status:** DRAFT (Step 0 of 120)
**Created:** 2026-06-02 (Asia/Kuala_Lumpur)
**Owner:** Riseup Asia LLC
**Source feature:** `standalone-scripts/macro-controller/src/ui/prompt-*.ts` + `standalone-scripts/prompts/**`

---

## 1. Purpose

Describe the **Prompts feature** (a library of reusable prompts that a user
can paste into a chat-box on a host web app, plus a **Next-task automation
loop** and **Plan-mode loop** that queues N prompt submissions with delays
between them) in a way that is **fully decoupled from this project's
implementation** (no Macro Controller, no Marco SDK, no Chrome-extension
assumptions). Any AI model — or any human team — who reads this spec must
be able to re-implement the feature in any host app (web, desktop,
extension, native) given only:

1. This spec folder.
2. The `standalone-scripts/prompts/` sample prompt corpus (read-only reference).
3. A short integration questionnaire (XPaths / element IDs / event hooks) the
   host app's owner answers once.

## 2. Hard rules for this spec

- **No mention of**: `MacroController`, `Marco SDK`, `chrome.storage`,
  `chrome.runtime`, `RiseupAsiaMacroExt`, IndexedDB store names, our
  SQLite schema, our React components, our build pipeline.
- **All host-site selectors are placeholders.** Every XPath, CSS selector,
  element ID, or DOM landmark a host app must supply is written as
  `???` with a `<!-- HOST: ... -->` comment explaining what the integrator
  must fill in. Never hard-code Lovable's selectors.
- **Framework-agnostic.** Pseudo-code may be written in TypeScript-flavoured
  syntax for clarity, but no React / Vue / Svelte / Angular API is required.
- **No backend assumption.** Persistence is described as an interface
  (`PromptStore`, `SettingsStore`, `QueueStore`); JSON-file, localStorage,
  IndexedDB, SQLite, REST, or in-memory are all valid implementations.

## 3. What the feature does (one paragraph)

A user opens a small UI surface in the host app, picks a saved prompt from
a categorised dropdown (or types a new one), and the prompt text is
**injected into the host site's chat-box** (a contenteditable, textarea, or
rich editor at a host-supplied XPath). A **"Next" action** lets the user
queue N copies of a "next-task" prompt; the system pastes the prompt,
clicks the host-supplied submit/"Add To Tasks" button, waits a configurable
delay (default 5–10s), then repeats until the queue is empty or cancelled.
A **Plan mode** uses the same queue engine with a "plan-task" prompt
template and a separate count.

## 4. Spec layout

```
spec/2026-prompts-generic/
  00-overview.md                ← (this file)
  01-plan-tasks-1-20.md         ← the 20-step plan for tasks 21–120
  10-glossary/                  ← created in Task 21–25
  20-data-model/                ← Task 26–30
  30-prompt-source-format/      ← Task 31–35
  40-loader-contract/           ← Task 36–40
  50-ui-contract/               ← Task 41–45
  60-injection-contract/        ← Task 46–55
  70-save-create-edit/          ← Task 56–60
  80-next-automation/           ← Task 61–65
  90-queue-engine/              ← Task 66–80
  100-failure-handling/         ← Task 81–85
  110-plan-mode/                ← Task 86–90
  120-settings/                 ← Task 91–95
  130-observability/            ← Task 96–100
  140-integration-onboarding/   ← Task 101–105   (host XPath questionnaire)
  150-test-plan/                ← Task 106–110
  160-reference-snippets/       ← Task 111–115
  170-adoption-checklist/       ← Task 116–120
```

## 5. Open integration questions (host app must answer)

These are tracked as `???` placeholders throughout the spec. Collected
master list lives in `140-integration-onboarding/` (created in Tasks 101–105).

| # | Question | Default if unknown |
|---|---|---|
| Q1 | XPath / CSS / id of the chat-box editable element | `???` |
| Q2 | XPath / CSS / id of the **submit / Add-to-Tasks** button | `???` |
| Q3 | XPath / CSS / id of any **"return to chat"** banner that signals interruption | `???` |
| Q4 | Editor kind: `contenteditable` \| `textarea` \| `prosemirror` \| `lexical` \| `monaco` \| `other` | `???` |
| Q5 | How does the host detect "logged out" (cookie name, DOM signal, API call)? | `???` |
| Q6 | Default per-task delay (seconds) | `7` (mid-point of 5–10) |
| Q7 | Max queue size | `999` |
| Q8 | Persistence backend for queue + settings | in-memory + `localStorage` |

## 6. Reading order

1. `00-overview.md` (this file)
2. `01-plan-tasks-1-20.md` — what gets written in tasks 21–120
3. Sections under `10-glossary/` … `170-adoption-checklist/` as they land
