# 54 — Logo prompt file numbering

**Date:** 2026-05-22
**Context:** User spec for `Logo Creation Instruction` said save to
`.lovable/prompts/02-logo-create.md`, but slot `02` is already occupied
by `02-write-memory.md` (and slots 01–05 are all taken).

## Options

| # | Option | Pros | Cons |
|---|--------|------|------|
| A | Save as `06-logo-create.md` (next free slot) | Preserves existing sequence; no overwrite | Diverges from user's literal path |
| B | Overwrite `02-write-memory.md` | Matches user path literally | Destroys an existing prompt; violates "never overwrite" convention |
| C | Renumber all existing files to insert at `02` | Matches spec | Breaks all existing cross-refs; high churn |

## Decision

**Chose A** — saved as `.lovable/prompts/06-logo-create.md` and
updated the index. Noted the renumber in the file's Actionable Items §8a.
The "02" in the user's spec appears to be illustrative of the sequence
pattern (01, 02, 03...) for the `Projects/` folder, not a strict slot
assignment in `.lovable/prompts/`.

## Reversal cost

Trivial — `git mv` to renumber if user objects.
