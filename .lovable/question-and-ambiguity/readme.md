# Question & Ambiguity Log

This folder satisfies the **No-Questions Mode** Core memory rule:
> Never call `ask_questions`. Log every ambiguity to `.lovable/question-and-ambiguity/NN-brief-title.md` with options + pros/cons + recommendation, then append a bullet to this README.

## Filename convention

`NN-brief-title.md` where `NN` is the next free integer (zero-pad to 2 digits when < 100; 3+ digits allowed past 99).

**Known duplicate prefixes (DO NOT add new files with these numbers):**
- `01-` — `credit-totals-and-macro-ux.md` and `import-export-screen-shape.md` (legacy duplicates; leave in place)
- `02-` — `db-diagrams-folder-location.md` and `hover-highlighter-shape.md` (legacy duplicates)
- `20-` — three files (legacy)
- `26-` — two files (legacy)

For all NEW ambiguities, pick the next free integer after the highest existing prefix. Run:
```bash
ls .lovable/question-and-ambiguity/ | grep -oE '^[0-9]+' | sort -n | tail -1
```
…and add 1.

## File template

```markdown
# NN — <brief title>

**Context:** <what the user asked, full prompt inline>

**Options:**
1. **<Option A>** — pros: …  cons: …
2. **<Option B>** — pros: …  cons: …

**Recommendation:** <Option X> because <reason>.
```

## Index of ambiguities

_(Append a bullet per new file: `- NN — title — recommendation taken/pending`.)_

- See files in this folder for the full list (legacy entries were not back-indexed; new entries should be appended here).
- 126 — chat-box Repeat selector + Next/Plan single-task append — recommendation pending (default: paste-then-submit cycle, last-picked prompt, panel-rendered Repeat selector 1..100).

_Created 2026-06-02 — Batch A remediation step 9._
- 62 — repeat-box collapse + prompts UI compaction + plan-section prompts (deferred from v3.59.0) — recommendation: ship as v3.60.0 "Repeat-box + Prompts UI polish".
