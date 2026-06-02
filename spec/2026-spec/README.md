# `spec/2026-spec/` — pointer

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)

This folder is a **pointer**, not a separate spec. The generic
prompt-runner spec lives at:

> **[`../2026-prompts-generic/`](../2026-prompts-generic/README.md)**

## Why two names?

The original brief (2026-06-02) was first executed under the name
`2026-prompts-generic/` and is complete:

- **T1–T120** — 120 sequenced spec tasks across 20 sub-folders
  (`10-glossary` … `200-adoption-checklist`).
- **H1–H10** — post-spec hardening backlog (banlist linter, Mermaid lint,
  JSON-schema validator for `info.json`, cross-link audit, acceptance
  extractor, PDF bundler, snippet typecheck harness, vanilla-HTML
  host-wiring PoC at `poc/2026-prompts-generic/`).

When the brief was re-issued asking for `spec/2026-spec/`, the existing
workstream already satisfied every acceptance criterion. To avoid
duplicating ~35 files, this pointer was created instead of a rename or a
copy. See ambiguity log
[`.lovable/question-and-ambiguity/59-2026-spec-folder-name.md`](../../.lovable/question-and-ambiguity/59-2026-spec-folder-name.md).

## Quick map

| What you want | Where to read |
|---|---|
| Read order + overview | [`../2026-prompts-generic/README.md`](../2026-prompts-generic/README.md) |
| 20-step plan + T1–T20 | [`../2026-prompts-generic/01-plan-tasks-1-20.md`](../2026-prompts-generic/01-plan-tasks-1-20.md) |
| Open selectors (chat box, Next, Plan) marked `?` | `../2026-prompts-generic/50-ui-contract/`, `60-injection-contract/`, `140-plan-mode/` |
| Queue + delay (5–10 s configurable) | `../2026-prompts-generic/100-queue-model/`, `110-queue-lifecycle/`, `120-delay-engine/` |
| Plan mode | `../2026-prompts-generic/140-plan-mode/` |
| Reference snippets (zero-dep TS) | `../2026-prompts-generic/190-reference-snippets/` |
| Runnable PoC | `../../poc/2026-prompts-generic/index.html` |
| Hardening backlog status | `../2026-prompts-generic/02-hardening-backlog.md` |

## If you really want this folder to hold the spec

Run: `git mv spec/2026-prompts-generic spec/2026-spec` and update the
`check:spec-banlist`, `check:spec-prompts-xrefs`, `spec:prompts:acceptance`,
`spec:prompts:pdf`, `check:prompts-info-json`, `check:spec-mermaid`,
`check:spec-snippets` script paths in `package.json` + `scripts/*.mjs`.
