# 04 — Dropdown Prompts Registry (canonical, v3.59.x)

Authoritative registry for the 8 prompts the macro-controller chat-box
dropdown ships with. Source of truth lives between the
`// <vbx:prompts:start>` and `// <vbx:prompts:end>` markers in the
macro-controller bundle; this file is the human/AI-readable contract.

Mirror files in `.lovable/prompts/` MUST stay byte-identical (after
`\n` decoding) to the body in the `PROMPTS` array.

## Registry

| # | Category | Slug | Title | Dynamic | Mirror | Trigger phrases |
|---|----------|------|-------|---------|--------|-----------------|
| 1 | Coding | `coding-guidelines` | Coding Guidelines | no | [`09-coding-guidelines.md`](../../.lovable/prompts/09-coding-guidelines.md) | `coding guidelines`, `read coding guidelines` |
| 2 | Conventions | `lowercase-readme-and-sequence` | Lowercase Readme And Sequence Slugs | no | [`10-lowercase-readme-and-sequence.md`](../../.lovable/prompts/10-lowercase-readme-and-sequence.md) | `lowercase readme`, `sequence slugs`, `file naming convention` |
| 3 | Explain | `explain-like-layman` | Explain Like I'm a Layman | no | [`11-explain-like-layman.md`](../../.lovable/prompts/11-explain-like-layman.md) | `explain like layman`, `explain like i'm five`, `eli5`, `eli-layman` |
| 4 | Memory | `read-memory` | Read Memory | no | [`05-read-memory.md`](../../.lovable/prompts/05-read-memory.md) | `read memory`, `recall memory`, `revise memory`, `revise prompt` |
| 5 | Memory | `write-memory` | Write Memory | no | [`03-write-memory.md`](../../.lovable/prompts/03-write-memory.md) | `write memory`, `end memory`, `update memory` |
| 6 | next | `next-steps` | Next ${N} steps | yes | [`12-next-steps-v7.md`](../../.lovable/prompts/12-next-steps-v7.md) | `next 1`, `next 2`, `next 3`, `next 4`, `next 5`, `next 8`, `next n steps`, `next n tasks` |
| 7 | Plan | `plan-steps` | Plan ${N} | yes | [`13-plan-steps-v7.md`](../../.lovable/prompts/13-plan-steps-v7.md) | `plan 5`, `plan 8`, `plan 10`, `plan 12`, `plan 15`, `plan 20`, `plan 25`, `plan 30`, `plan 35`, `plan 40`, `plan 45`, `plan 50`, `plan 100` |
| 8 | Proofread | `proofread` | Proofread | no | [`07-proof-read.md`](../../.lovable/prompts/07-proof-read.md) | `proofread`, `proof read`, `rewrite`, `rewrite next`, `next` (in proofread mode) |

## Dynamic-prompt expansion contract

For rows with `Dynamic = yes`, the array carries `replaceKey`, `replaceValues`,
and `slugTemplate`. At runtime the dropdown expands each `replaceValue` into
its own visible option, substituting `${replaceKey}` in `title` and `body`
and using `slugTemplate` for the per-option slug.

| Slug | replaceKey | replaceValues | slugTemplate |
|------|-----------|---------------|--------------|
| `next-steps` | `N` | `1, 2, 3, 4, 5, 8` | `next-${N}-steps` |
| `plan-steps` | `N` | `5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 100` | `plan-${N}` |

## Sync workflow (non-negotiable)

1. Edit the `.md` mirror first.
2. Regenerate `PROMPTS` from the mirror.
3. Bump the macro-controller minor version.
4. Update the "shipped in" header in `.lovable/memory/prompts/dropdown-prompts-registry.md`.

Never hand-edit the `PROMPTS` array without re-syncing the mirror — the
dropdown text would silently drift from `.lovable/prompts/`.

## Related

- `.lovable/prompts.md` — full human-readable prompt index (includes superseded + archived prompts not in the dropdown).
- `.lovable/memory/prompts/dropdown-prompts-registry.md` — same registry in memory form.
