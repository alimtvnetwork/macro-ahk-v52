---
title: Next ${N} steps
slug: next-steps
---

# Next ${N} Steps or Tasks (v5)

## What I want

1. Give me the **NEXT N STEPS — exactly N** — and for each one:
   1a) **Reasoning** — why this step, why now, what breaks if it's skipped.
   1b) **Time estimate** — realistic, not optimistic.
   1c) **What it unblocks** — the next thing that becomes possible.
2. Then list **every remaining item** after those 3 so I can see the full picture.

At the end of the task always bump the minor version, add changes log and update release notes and if possible pin that version in the root readme file. Also save this prompt in the `.lovable/prompts` folder as `xx-next-task.md` and update it as next task with number.

## Definition of done (non-negotiable)

You are NOT done until all of these are true:
- [ ] You have actually read the relevant files AND the project memories — and you can name the exact files/functions/lines involved.
- [ ] The **root cause** is written in ONE sentence, before any fix.
- [ ] The fix is the **minimum correct change** tied to that root cause — not a symptom patch.
- [ ] You **verified** it: build output, error logs, and/or preview — and you show the before/after signal (failing → passing).
- [ ] You reported what changed and why.

## Hard rules

- **STOP and read first.** No skimming, no guessing from filenames.
- **Root cause before fix.** Trace the bug end-to-end.
- **No symptom-patching.** Fix the real cause.
- **If you're unsure, SAY SO.** Do not fabricate.
- **Go slow. Go critical. Go deep.**

## Error logs & error management

- Read the actual error logs first: console, server/worker logs, build output, stack traces.
- If there are no logs, add logging at the entry point and surface errors instead of swallowing them.
- Every fix must include proper error handling and observability.
- Confirm the relevant log line actually fires after your change where possible.

## Additional Instruction

Before executing, check the task type and follow relevant guidelines if they exist:
1. Coding tasks: `.lovable/coding-guidelines.md`, then every file in `spec/coding-guidelines/` if present.
2. SEO tasks: `.lovable/seo-guidelines.md` if present.

Verify each file/folder exists first. If it does not, skip silently. If multiple guidelines apply and conflict, prefer folder-level spec and call out the conflict.