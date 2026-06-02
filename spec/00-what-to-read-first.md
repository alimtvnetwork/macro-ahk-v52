# What to Read First — Blind AI Entry Point

If you are an AI agent starting fresh on this project, read these files in this exact order. Stop at the first one that answers your current task.

## Mandatory reading order

1. **`plan.md`** (repo root) — Canonical roadmap. Single source of truth for priorities, backlog, and milestones. _Note: `.lovable/plan.md` is a pointer only — do not edit it._
2. **`.lovable/coding-guidelines.md`** — Project-specific coding rules (CQ rules, naming, error handling, type safety).
3. **`spec/17-consolidated-guidelines/`** — Full guideline corpus. The `.lovable/coding-guidelines.md` file is a summary; this folder is authoritative for any rule not in the summary.
4. **Memory index** (`mem://index.md`) — Always in context. Core rules apply to every action; Memories list points to deeper rule files.
5. **`spec/strictly-avoid.md`** (if present) and **`mem://constraints/*`** — Hard bans. Violations break the build or the project.
6. **`spec/audit/blind-ai-implementation-audit/progress.md`** — Audit findings + remediation plan. Tells you which areas of the spec are weak and what's being actively fixed.

## Quickstart questions

| Question | Where to look |
|---|---|
| What should I work on next? | `plan.md` (top section) |
| What naming convention applies? | `mem://architecture/constant-naming-convention` |
| How do I log an error? | `mem://standards/error-logging-via-namespace-logger.md` |
| Can I use library X? | Check `mem://constraints/*` first; many libs are banned (Supabase, framer-motion, gsap, etc.) |
| Where do failure logs go? | `mem://standards/verbose-logging-and-failure-diagnostics` |
| Is feature Y deferred? | `mem://preferences/deferred-workstreams` (only `P Store` is deferred) |

## Do NOT

- Do not edit `skipped/` or `.release/` (read-only archives — `mem://constraints/skipped-folders`).
- Do not add Supabase, framer-motion, or gsap (`mem://constraints/no-supabase`, audit S77).
- Do not assume OPFS exists (it does not — `mem://architecture/session-logging-system`).
- Do not edit `.lovable/plan.md` as if it were the plan (it is a pointer — see audit S81).
- Do not invent retry/backoff loops (`mem://constraints/no-retry-policy`).

## If you are confused

Log the ambiguity to `.lovable/question-and-ambiguity/NN-brief-title.md` (the No-Questions Mode rule). Do not call `ask_questions`.

_Last updated: 2026-06-02 — Batch A remediation step 7._
