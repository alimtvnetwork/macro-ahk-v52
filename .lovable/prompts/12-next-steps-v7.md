# Next ${N} Steps Complete Exactly (v7)

> **Version:** 7.0 (verbatim capture from user, 2026-06-19)
> **Category:** `next` (dynamic — `N` is parsed from the prompt header)
> **Trigger phrases (v3.63.0 sequence):** `next 1`, `next 2`, `next 3`, `next 4`, `next 5`, `next 7`, `next 8`, `next 10`, `next 12`, `next 15`
> **Slug template:** `next-${N}-steps`

Parse the requested count from the prompt title/header before doing
anything else. For any count-bearing next-steps/tasks header, that
number is **N**.

- Use that exact **N** everywhere in the answer.
- Give exactly **N** next steps: not N-1, not N+1.
- Never leave count text unless it matches the parsed N.
- If no count is present or the count is ambiguous, stop and ask for
  the count.

## What I want

1. Give me exactly **N requested steps/tasks** — and for each one:
   1a) **Reasoning** — why this step, why now, what breaks if it's skipped.
   1b) **Time estimate** — realistic, not optimistic.
   1c) **What it unblocks** — the next thing that becomes possible.

2. Then list **every remaining item** after those **N** steps/tasks
   so I can see the full picture.

## Definition of done (non-negotiable)

You are NOT done until all of these are true:
- [ ] You have actually read the relevant files AND the project
  memories — and you can name the exact files/functions/lines
  involved.
- [ ] The **root cause** is written in ONE sentence, before any fix.
- [ ] The fix is the **minimum correct change** tied to that root
  cause — not a symptom patch.
- [ ] You **verified** it: build output, error logs, and/or preview —
  and you show the before/after signal (failing → passing).
- [ ] You reported what changed and why.

## Hard rules

- **STOP and read first.** No skimming, no guessing from filenames.
  If you can't name the exact lines, you haven't read enough — go back.
- **Root cause before fix.** Trace the bug end-to-end. No
  assumptions. No "this should work."
- **No symptom-patching.** If your "fix" is a try/catch, a fallback
  value, or a re-render hack used to hide the problem, you've failed
  — start over.
- **If you're unsure, SAY SO.** Do not fabricate. A wrong-but-confident
  answer is worse than "I don't know yet."
- **Go slow. Go critical. Go deep.** Depth is not optional polish —
  it IS the entire job. Fast + wrong = useless and wastes another
  full loop.

## Error logs & error management (ALWAYS focus on this)

- Read the actual error logs FIRST — console, server/worker logs,
  build output, stack traces. The answer is usually already there.
- If there are NO logs, that itself is the bug: add logging at the
  entry point and surface errors instead of swallowing them. Silent
  failure is unacceptable.
- Every fix must include proper error handling and observability:
  errors must be logged with context and surfaced, never hidden.
- Confirm the relevant log line actually fires after your change. If
  you can't see it in the logs, you haven't proven the fix.

## Save/version boundary

This counted next-task prompt does **not** save, re-save, version, or
register prompt files. The registry-aware save/version lifecycle
lives only in the plan-prompt family.

## Single-task append rule (Issue 126 — 2026-06-19)

This prompt body is **single-task append** semantics, not an
auto-loop. Picking "Next ${N} steps" from the prompt dropdown:

1. Substitutes `N` into the prompt body.
2. **Appends** the body to the chat box (does NOT replace).
3. Does NOT auto-click submit or auto-repeat.

Repetition is controlled by the separate **Repeat** selector in the
chat-box panel (see `.lovable/question-and-ambiguity/126-...`).

## Why I'm being blunt

You have been as stupid as the bad work you've done in the past —
fast, shallow, written without reading the codebase. It is very
frustrating. WTF. I'm done paying for that in time and rework. So
this time: read properly, find the real cause, fix it once, and prove
it with the logs. No excuses.

---

## Additional Instruction (must follow if matches)

Before executing, check the task type and follow the relevant
guidelines if they exist (skip silently if the file is missing):

1. **Coding tasks** (especially Golang, Python, PHP, or other backend):
   - Check for `.lovable/coding-guidelines.md`. If present, follow it.
   - Also check `spec/coding-guidelines/`. If present, follow every
     file inside.
   - **Error-management folder (MANDATORY for coding tasks).** It
     lives inside a `spec`/guidelines folder and is a folder of
     multiple files (named anything). Check `spec/XX-error-manage/`
     (e.g. `spec/01-error-manage/`) and
     `coding-guidelines/XX-error-manage/` (e.g.
     `coding-guidelines/01-error-manage/`), where `XX` is a
     zero-padded sequence (`01`, `02`, …). Read **every** file
     inside any such folder and apply it (logging, error surfacing,
     retries, failure handling) to every step that touches code.
   - If this is a coding task and none of these exist, ask me to
     provide one.

2. **SEO tasks** (website/SEO-related):
   - Check for `.lovable/seo-guidelines.md`. If present, follow it.

Rule: verify the file/folder exists first. If it does not, skip that
guideline silently. If multiple guidelines apply, follow all of them;
if they conflict, prefer the folder-level spec and call out the
conflict.
