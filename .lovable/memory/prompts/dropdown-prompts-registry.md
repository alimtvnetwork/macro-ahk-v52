---
name: Canonical dropdown prompts registry (v3.59.x)
description: The 8 prompts shipped in the macro-controller prompt dropdown (vbx PROMPTS array). Maps category/slug to .lovable/prompts/*.md mirror file. Authoritative for trigger phrases.
type: reference
---

# Dropdown Prompts — Canonical Registry

Source of truth: the `PROMPTS` array between the `// <vbx:prompts:start>` / `// <vbx:prompts:end>` markers in the macro-controller bundle.
Mirror (human-readable + AI-loadable): the `.lovable/prompts/*.md` files below. Bodies must match byte-for-byte after `\n` decoding.

| # | Category | Slug | Title | Dynamic | Mirror file |
|---|----------|------|-------|---------|-------------|
| 1 | Coding | `coding-guidelines` | Coding Guidelines | no | `.lovable/prompts/09-coding-guidelines.md` |
| 2 | Conventions | `lowercase-readme-and-sequence` | Lowercase Readme And Sequence Slugs | no | `.lovable/prompts/10-lowercase-readme-and-sequence.md` |
| 3 | Explain | `explain-like-layman` | Explain Like I'm a Layman | no | `.lovable/prompts/11-explain-like-layman.md` |
| 4 | Memory | `read-memory` | Read Memory | no | `.lovable/prompts/05-read-memory.md` |
| 5 | Memory | `write-memory` | Write Memory | no | `.lovable/prompts/03-write-memory.md` |
| 6 | next | `next-steps` | Next ${N} steps | **yes** — `N ∈ {1,2,3,4,5,8}`, slugTemplate `next-${N}-steps` | `.lovable/prompts/12-next-steps-v7.md` |
| 7 | Plan | `plan-steps` | Plan ${N} | **yes** — `N ∈ {5,8,10,12,15,20,25,30,35,40,45,50,100}`, slugTemplate `plan-${N}` | `.lovable/prompts/13-plan-steps-v7.md` |
| 8 | Proofread | `proofread` | Proofread | no | `.lovable/prompts/07-proof-read.md` |

## Sync rule

When either side changes:
1. Edit the **`.md` mirror first** (humans + AI read it).
2. Re-emit the `PROMPTS` array from the mirror (script: planned `scripts/sync-dropdown-prompts.mjs`).
3. Bump the macro-controller minor version (registry change = behavior change).
4. Update this memory file's "shipped in" header.

Never edit the `PROMPTS` array directly without updating the mirror — the dropdown text would silently drift from `.lovable/prompts/`.

## Trigger-phrase lookup (authoritative)

See the spec at `spec/01-prompt-spec-2026/04-dropdown-prompts-registry.md` for the canonical trigger-phrase list (the same row data, machine-readable). The `.lovable/prompts.md` index keeps the human reading list.
