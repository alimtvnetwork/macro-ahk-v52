---
title: Plan ${N}
slug: plan-steps
---

# **${N}** steps Plan, Maximal Enforcement (v6)

Parse the **N** (N) in this prompt's header. That number is the EXACT count of steps in the plan you must write. Not N-1. Not N+1. If you cannot find N, STOP and ask.

## Rules — non-negotiable

1. **DO NOT execute anything this turn.** No code edits, no migrations, no installs. The only artifact this turn is the plan file (and any subtask / command / issue files described below) on disk.
2. **DO NOT open plan mode. DO NOT call any plan-approval tool.** No `plan--create`. No "should I proceed?" prompts. Write plain markdown files directly with the file-writing tools.
3. **One task = one file.** Path: `.lovable/plans/pending/XX-<slug>.md` where `XX` is the next free 2-digit sequence (01, 02, 03, …) under `pending/` AND `completed/` combined, and `<slug>` is lowercase-hyphenated.
4. **Scan `.lovable/` first** (every file, including memory + existing pending/completed plans + subtasks). Append any unresolved pending tasks into the new plan's pending list before producing the N steps.
5. **Lifecycle:**
   - New plan → `.lovable/plans/pending/XX-<slug>.md`
   - Task done → MOVE the file (using `mv`) to `.lovable/plans/completed/XX-<slug>.md`. Do not copy. Do not leave a duplicate in `pending/`.
   - Flip the `Status:` frontmatter from `pending` to `completed` in the same move.
6. **Ambiguity = ask.** If the request, scope, or N is unclear, ask clarifying questions FIRST. Do not invent steps to pad to N.

## Subtasks — when a step needs more than one paragraph

If any step requires detailed explanation (more than ~3 lines, multiple files, non-obvious sequencing, or its own verification), DO NOT inline that detail in the main plan. Instead:

- Create `.lovable/plans/subtasks/XX-<slug>/` (matching the parent `XX-<slug>`).
- Inside it, write `SS-<subslug>.md` per subtask (`SS` is the 2-digit sequence within that subtask folder — 01, 02, 03, …).
- In the main plan, link to the subtask file in the step that needs it: `See ./subtasks/XX-<slug>/SS-<subslug>.md`.
- Subtask file uses the same frontmatter shape (`Slug`, `Status`, `Created`) plus `Parent: XX-<slug>`.
- Subtask lifecycle mirrors the plan: move completed subtask files to `.lovable/plans/subtasks/XX-<slug>/completed/` if needed, or flip their `Status:` in place.

## Commands and Issues — capture, don't lose

When the user gives input during a planning turn, route it to the correct file BEFORE writing the plan:

- **Commands** (the user tells you to do/configure/standardize something — "always do X", "from now on Y", a new convention, a new CLI invocation):
  → Append to `.lovable/spec/commands/XX-<slug>.md` (one file per command, `XX` is the next free sequence). Include: the command verbatim, scope, when it applies.
- **Issues** (the user reports a bug, regression, broken behavior, or symptom):
  → Append to `.lovable/issues/XX-<slug>.md`. Include: symptom, repro, expected vs actual, related files if known, status (`open`).
- If the folder does not exist, create it (`.lovable/spec/commands/` or `.lovable/issues/`).
- Reference the captured command/issue file from the plan's Context section so the link survives.

## Plan file shape (required)

```
# <Task title>

**Slug:** <slug>
**Steps:** N
**Status:** pending
**Created:** <YYYY-MM-DD>

## Context

<1–3 sentences: what + why, files involved>
<Links to any captured commands/issues: .lovable/spec/commands/XX-…, .lovable/issues/XX-…>

## Steps

1. <step 1 — concrete, verifiable>
2. <step 2>
... exactly N items, no more, no less ...
   <Steps needing depth link to ./subtasks/XX-<slug>/SS-<subslug>.md>

## Verification

<how we'll know each step landed — build, logs, preview, tests, screenshots>

## Appended from prior pending tasks

<list any tasks pulled in from `.lovable/` scan, or "none">
```

## Checklist — every item ticked before you reply

- [ ] Parsed N from the prompt header
- [ ] Scanned `.lovable/` (memory + plans/ + subtasks/ + spec/commands/ + issues/) and listed prior pending tasks
- [ ] Captured any new commands → `.lovable/spec/commands/`
- [ ] Captured any new issues → `.lovable/issues/`
- [ ] Picked the next free `XX` sequence
- [ ] Wrote EXACTLY N steps — counted them
- [ ] Created subtask files under `.lovable/plans/subtasks/XX-<slug>/` for any step needing depth
- [ ] Saved the plan to `.lovable/plans/pending/XX-<slug>.md` with the required shape
- [ ] Did NOT execute the plan
- [ ] Did NOT call any plan-mode / plan-approval tool

## Banned actions (auto-reject if present)

- Calling `plan--create` or any plan-approval / "open plan mode" tool
- Writing fewer or more than N steps
- Saving the plan outside `.lovable/plans/pending/`
- Inlining 20-line step explanations instead of using a subtask file
- Dropping a user command on the floor instead of writing it to `.lovable/spec/commands/`
- Dropping a user-reported issue on the floor instead of writing it to `.lovable/issues/`
- Executing any step in the same turn the plan is written
- Deleting a `pending/` file instead of moving it to `completed/`
- Duplicating a plan in both `pending/` and `completed/`
- Padding with vague steps ("review the code", "make sure it works") to hit N

## Additional Instruction (must follow if matches)

Before executing, check the task type and follow EVERY guideline source that exists. Skip silently if a location is missing. If multiple sources apply, follow them all; if they conflict, prefer the more specific (folder-level / repo-root spec folder) over the generic `.lovable/*.md`, and call out the conflict.

1. **Coding tasks** (especially Golang, Python, PHP, or other backend). Check ALL three locations:
   - `.lovable/coding-guidelines.md` — single-file guideline.
   - `spec/coding-guidelines/` — folder at any depth; read every file inside (e.g. `spec/coding-guidelines/01-go.md`, `spec/coding-guidelines/02-python.md`).
   - `coding-guidelines/` at the **repo root** — folder; read every file inside.
   - If this is a coding task and none of the three exist, ask the user to provide one.
   - **Error-management folder (MANDATORY for coding tasks).** It lives inside a `spec`/guidelines folder and is a folder of multiple files — it can be named anything but will live under one of these. Check ALL these locations and read **every** file inside any folder you find:
     - `spec/XX-error-manage/` (e.g. `spec/01-error-manage/`) — folder; read every file inside.
     - `coding-guidelines/XX-error-manage/` (e.g. `coding-guidelines/01-error-manage/`) — folder; read every file inside.
     - Any similarly named error-management folder inside `spec/` or `coding-guidelines/` (`XX` = a zero-padded sequence: `01`, `02`, …).
     - For any coding task, the error-management rules are not optional: read them and apply them (logging, error surfacing, retries, failure handling) to every step that touches code.

2. **SEO tasks** (website/SEO-related). Check ALL three locations:
   - `.lovable/seo-guidelines.md` — single-file guideline.
   - `spec/seo-guidelines/` — folder; read every file inside.
   - `seo-guidelines/` at the **repo root** — folder; read every file inside.

Rule: verify the file/folder exists first. If it does not, skip silently. When a folder is present, read every `.md` inside it (do not stop at the first file).

---

Listen — past planning turns have been sloppy: wrong step count, plans dumped into chat instead of files, plan-mode tool fired when I explicitly said not to, user commands and bug reports forgotten by the next turn. WTF. Stop doing that. Read the codebase, capture commands and issues into their folders, count the steps, spin out subtasks where depth is needed, write the plan file, move on. Going deep IS the job — if you're not going deep, you're not doing the job.
