# Prompts Index

Canonical index of every persisted prompt under `.lovable/prompts/`.
Each prompt file captures a verbatim instruction or protocol from the
user so that future AI sessions can reload the exact intent without
re-deriving it from chat history.

## Format

- One row per prompt file, in numeric order.
- The **Tags** column lists every trigger phrase or short alias the
  user has used to invoke the prompt — so a future AI can `grep` for
  any of those phrases and land on the right file.
- Status: `active` (currently in force) / `superseded` (replaced by a
  newer version) / `archived` (one-shot, no longer needed).

## Entries

| # | File | Title | Tags | Status |
|---|------|-------|------|--------|
| 01 | [01-write-memory.md](./prompts/01-write-memory.md) | Write Memory v1.0 | `write memory`, `end memory` | superseded by 03 |
| 02 | [02-write-memory.md](./prompts/02-write-memory.md) | Write Memory v2.0 | `write memory`, `end memory`, `update memory` | superseded by 03 |
| 03 | [03-write-memory.md](./prompts/03-write-memory.md) | Write Memory v3.0 (CI/CD issues + verbatim spec capture) | `write memory`, `end memory`, `update memory` | active |
| 04 | [04-no-questions.md](./prompts/04-no-questions.md) | No-Questions Mode (40-task window) | `no question`, `not ques for 40`, `no-questions mode` | active |
| 05 | [05-read-memory.md](./prompts/05-read-memory.md) | Read Memory | `read memory`, `recall memory`, `revise memory`, `revise prompt` | active |
| 06 | [06-logo-create.md](./prompts/06-logo-create.md) | Logo Create (Projects/ scaffold, SVG + raster + palette + favicon + README) | `create logo`, `make logo`, `logo`, `create icon`, `make icon`, `logo create` | active |
| 07 | [07-proof-read.md](./prompts/07-proof-read.md) | Proofread / Rewrite (DO NOT ACT — rewrite only) | `proofread`, `proof read`, `rewrite`, `rewrite next`, `next` (in proofread mode) | active |
| 08 | [08-bump-version.md](./prompts/08-bump-version.md) | Bump Version (minor bump + changelog + README pin) | `bump version`, `bump minor`, `pre-bump`, `version bump`, `release bump` | active |
| 09 | [09-coding-guidelines.md](./prompts/09-coding-guidelines.md) | Coding Guidelines (verbatim, 15 rules) | `coding guidelines`, `read coding guidelines` | active |
| 10 | [10-lowercase-readme-and-sequence.md](./prompts/10-lowercase-readme-and-sequence.md) | Lowercase Readme + `NN-kebab.md` Convention | `lowercase readme`, `sequence slugs`, `file naming convention` | active |
| 11 | [11-explain-like-layman.md](./prompts/11-explain-like-layman.md) | Explain Like I'm a Layman (v1) | `explain like layman`, `explain like i'm five`, `eli5`, `eli-layman` | active |
| 12 | [12-next-steps-v7.md](./prompts/12-next-steps-v7.md) | Next ${N} Steps (v7) — single-task append (Issue 126) | `next 1`, `next 2`, `next 3`, `next 4`, `next 5`, `next 8`, `next n steps`, `next n tasks` | active |
| 13 | [13-plan-steps-v7.md](./prompts/13-plan-steps-v7.md) | Plan ${N} (v7) — Evidence Enforcement, single-task append (Issue 126) | `plan 5`, `plan 8`, `plan 10`, `plan 12`, `plan 15`, `plan 20`, `plan 25`, `plan 30`, `plan 35`, `plan 40`, `plan 45`, `plan 50`, `plan 100` | active |
## Dropdown-shipped subset (canonical, v3.59.x)

These 8 prompts are exposed in the macro-controller chat-box dropdown
(`PROMPTS` array, vbx markers). See `spec/01-prompt-spec-2026/04-dropdown-prompts-registry.md`
and `mem://prompts/dropdown-prompts-registry` for the authoritative
registry and sync workflow:

- 03 Write Memory · 05 Read Memory · 07 Proofread · 09 Coding Guidelines
- 10 Lowercase Readme + Sequence · 11 Explain Like Layman
- 12 Next ${N} (dynamic: 1/2/3/4/5/8) · 13 Plan ${N} (dynamic: 5..100)
