---
title: Next ${N} steps
slug: next-steps
---

# Next ${N} Steps or Tasks (v5)

## What I want

1. Give me the **NEXT N STEPS — exactly N** — and for each one:
   1a) **Reasoning** — why this step, why now, what breaks if skipped.
   1b) **Time estimate** — realistic, not optimistic.
   1c) **What it unblocks** — the next thing that becomes possible.
2. Then list **every remaining item** after those steps so the full picture is visible.
3. At the end of the task always bump the minor version, add changelog, update release notes, pin that version in the root readme when possible, save this prompt in `.lovable/prompts/xx-next-task.md`, and update it as the next task with number.

## Definition of done

- Read relevant files and project memories; name exact files/functions/lines involved.
- Write root cause in one sentence before any fix.
- Apply the minimum correct change tied to root cause.
- Verify with build output, error logs, tests, and/or preview; show failing → passing signal.
- Report what changed and why.

## Hard rules

- Stop and read first; no guessing from filenames.
- Root cause before fix.
- No symptom patching.
- If unsure, say so.
- Go slow, critical, and deep.

## Error logs & error management

- Read actual error logs first.
- If there are no logs, add/surface logging at the entry point.
- Every fix includes proper error handling and observability.
- Confirm the relevant log line or test signal after the change.

## Additional instruction

Before executing, check task type and follow existing guideline files if present:

1. Coding tasks: `.lovable/coding-guidelines.md`, plus every file under `spec/coding-guidelines/` if that folder exists. If neither exists, ask for guidelines.
2. SEO tasks: `.lovable/seo-guidelines.md` if present.

Verify paths exist first; silently skip missing guideline files. If guidelines conflict, prefer folder-level spec and call out the conflict.