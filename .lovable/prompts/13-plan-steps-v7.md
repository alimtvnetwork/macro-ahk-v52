# Plan in ${N}-Steps Plan (v7) — Evidence Enforcement

> **Version:** 7.0 (verbatim capture from user, 2026-06-19)
> **Category:** `Plan` (dynamic — `N` is parsed from the prompt header)
> **Trigger phrases (v3.63.0 sequence):** `plan 2`, `plan 3`, `plan 5`, `plan 8`, `plan 10`, `plan 12`, `plan 14`, `plan 15`, `plan 18`, `plan 20`, `plan 22`, `plan 25`, `plan 28`, `plan 30`, `plan 32`, `plan 35`, `plan 38`, `plan 40`, `plan 42`, `plan 45`, `plan 48`, `plan 50`, `plan 52`, `plan 55`, `plan 58`, `plan 60`, `plan 70`, `plan 80`, `plan 100`, `plan 150`, `plan 200`
> **Slug template:** `plan-${N}`

> **Sequence notation:** `XX` means a zero-padded 2-digit sequence
> number — `01`, `02`, `03`, and so on. Wherever you see `XX` (and
> `SS` for subtask sequences), substitute the next free 2-digit
> number. Do not use any other placeholder (no `NN`).

Parse the **N** (`${N}`) in this prompt's header. That number is the
EXACT count of steps in the plan you must write. Not N-1. Not N+1.
If you cannot find N, STOP and ask.

## Rules — non-negotiable

1. **DO NOT execute anything this turn.** No code edits, no
   migrations, no installs. The only artifact this turn is the plan
   file (and any subtask / command / issue files described below) on
   disk.
2. **DO NOT open plan mode. DO NOT call any plan-approval tool.** No
   `plan--create`. No "should I proceed?" prompts. Write plain
   markdown files directly with the file-writing tools.
3. **One task = one file.** Path:
   `.lovable/plans/pending/XX-<slug>.md` where `XX` is the next free
   2-digit sequence (`01`, `02`, `03`, …) under `pending/` AND
   `completed/` combined, and `<slug>` is lowercase-hyphenated.
4. **Scan `.lovable/` first** (every file, including memory + existing
   pending/completed plans + subtasks). Append any unresolved pending
   tasks into the new plan's pending list before producing the N
   steps.
5. **Lifecycle:**
   - New plan → `.lovable/plans/pending/XX-<slug>.md`
   - Before completion → fill the plan file's `## Evidence` block
     with the exact failing → passing signal, log line, build/test
     output, screenshot note, or other proof used to verify the work.
   - Task done → MOVE the file (using `mv`) to
     `.lovable/plans/completed/XX-<slug>.md`. Do not copy. Do not
     leave a duplicate in `pending/`.
   - Flip the `Status:` frontmatter from `pending` to `completed` in
     the same move.
6. **Ambiguity = ask.** If the request, scope, or N is unclear, ask
   clarifying questions FIRST. Do not invent steps to pad to N.

## Single-task append rule (Issue 126 — 2026-06-19)

This prompt body is **single-task append** semantics, not an
auto-loop. Picking "Plan ${N}" from the prompt dropdown:

1. Substitutes `N` into the prompt body.
2. **Appends** the body to the chat box (does NOT replace).
3. Does NOT auto-click submit or auto-repeat.

Repetition is controlled by the separate **Repeat** selector in the
chat-box panel (see `.lovable/question-and-ambiguity/126-...`).

## Subtasks — when a step needs more than one paragraph

If any step requires detailed explanation (more than ~3 lines,
multiple files, non-obvious sequencing, or its own verification), DO
NOT inline that detail in the main plan. Instead:

- Create `.lovable/plans/subtasks/XX-<slug>/` (matching the parent
  `XX-<slug>`).
- Inside it, write `SS-<subslug>.md` per subtask (`SS` is the 2-digit
  sequence within that subtask folder — 01, 02, 03, …).
- In the main plan, link to the subtask file in the step that needs
  it: `See ./subtasks/XX-<slug>/SS-<subslug>.md`.
- Subtask file uses the same frontmatter shape (`Slug`, `Status`,
  `Created`) plus `Parent: XX-<slug>`.
- Subtask lifecycle mirrors the plan: move completed subtask files
  to `.lovable/plans/subtasks/XX-<slug>/completed/` if needed, or
  flip their `Status:` in place.

## Commands and Issues — capture, don't lose

When the user gives input during a planning turn, route it to the
correct file BEFORE writing the plan:

- **Commands** (the user tells you to do/configure/standardize
  something — "always do X", "from now on Y", a new convention, a new
  CLI invocation):
  → Append to `.lovable/spec/commands/XX-<slug>.md` (one file per
  command, `XX` is the next free sequence). Include: the command
  verbatim, scope, when it applies.
- **Issues** (the user reports a bug, regression, broken behavior, or
  symptom):
  → Append to `.lovable/issues/XX-<slug>.md`. Include: symptom,
  repro, expected vs actual, related files if known, status (`open`).
- If the folder does not exist, create it (`.lovable/spec/commands/`
  or `.lovable/issues/`).
- Reference the captured command/issue file from the plan's Context
  section so the link survives.

## Saving the next-task prompt — check once, save once (registry-aware)

This rule governs BOTH this plan-task prompt and the next-task
prompt — saving lives ONLY here, never in the next-task prompt itself.

- **Check the registry exactly ONCE.** When a next-task or
  count-bearing next-steps/tasks request comes in, open the root
  `prompts/index.md` a single time and look for an already-registered
  next-task prompt family (it is `prompts/01-next-steps-prompt/`,
  with current best `07-next-n-steps-v7.md`) and its counted
  next-task trigger phrases.
- **If it already exists → DO NOT save.** It already does:
  `prompts/01-next-steps-prompt/` is registered. Numbered
  counted-task follow-ups are all served by that one family. Just
  answer using it. Never create a new prompt file for an
  already-registered counted-task prompt, including older save
  aliases.
- **If it did NOT exist → save it exactly ONCE** under
  `prompts/01-next-steps-prompt/NN-<slug>-vN.md` (next free
  sequence) and add one row to the root `prompts/index.md`. Do not
  save each step as its own file, do not create a new file per "next
  M" follow-up, and do not duplicate an existing entry.
- **When completing implemented work → update release docs.** Bump
  the minor version in `VERSION`, append `CHANGELOG.md`, update
  `RELEASE_NOTES.md`, and pin the new version in the root `readme.md`
  when possible. This release/version duty lives here with the save
  lifecycle, not inside the next-task prompt files.
- **Remember it.** Record in memory that the counted-task prompt
  family is registered, so future numbered counted-task requests and
  older save aliases are recognized as the same registered request
  and never re-saved.

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

## Evidence
- Before: <initial failing signal, missing guard, stale log, or "pending until execution">
- After: <passing signal to paste before moving to completed>
- Proof: <command output, log line, screenshot note, or artifact link>

## Appended from prior pending tasks
<list any tasks pulled in from `.lovable/` scan, or "none">
```

## Checklist — every item ticked before you reply

- [ ] Parsed N from the prompt header
- [ ] Scanned `.lovable/` (memory + plans/ + subtasks/ +
  spec/commands/ + issues/) and listed prior pending tasks
- [ ] Captured any new commands → `.lovable/spec/commands/`
- [ ] Captured any new issues → `.lovable/issues/`
- [ ] Picked the next free `XX` sequence
- [ ] Wrote EXACTLY N steps — counted them
- [ ] Created subtask files under `.lovable/plans/subtasks/XX-<slug>/`
  for any step needing depth
- [ ] Saved the plan to `.lovable/plans/pending/XX-<slug>.md` with the
  required shape, including `## Evidence`
- [ ] Did NOT execute the plan
- [ ] Did NOT call any plan-mode / plan-approval tool

## Banned actions (auto-reject if present)

- Calling `plan--create` or any plan-approval / "open plan mode" tool
- Writing fewer or more than N steps
- Saving the plan outside `.lovable/plans/pending/`
- Inlining 20-line step explanations instead of using a subtask file
- Dropping a user command on the floor instead of writing it to
  `.lovable/spec/commands/`
- Dropping a user-reported issue on the floor instead of writing it
  to `.lovable/issues/`
- Executing any step in the same turn the plan is written
- Moving any task to `completed/` with an empty or placeholder-only
  `## Evidence` block
- Deleting a `pending/` file instead of moving it to `completed/`
- Duplicating a plan in both `pending/` and `completed/`
- Padding with vague steps ("review the code", "make sure it works")
  to hit N

## Additional Instruction (must follow if matches)

Before executing, check the task type and follow EVERY guideline
source that exists. Skip silently if a location is missing. If
multiple sources apply, follow them all; if they conflict, prefer the
more specific (folder-level / repo-root spec folder) over the generic
`.lovable/*.md`, and call out the conflict.

1. **Coding tasks** (especially Golang, Python, PHP, or other
   backend). Check ALL three locations:
   - `.lovable/coding-guidelines.md` — single-file guideline.
   - `spec/coding-guidelines/` — folder at any depth; read every file
     inside (e.g. `spec/coding-guidelines/01-go.md`,
     `spec/coding-guidelines/02-python.md`).
   - `coding-guidelines/` at the **repo root** — folder; read every
     file inside.
   - If this is a coding task and none of the three exist, ask the
     user to provide one.
   - **Error-management folder (MANDATORY for coding tasks).** It
     lives inside a `spec`/guidelines folder and is a folder of
     multiple files — it can be named anything but will live under
     one of these. Check ALL these locations and read **every** file
     inside any folder you find:
     - `spec/XX-error-manage/` (e.g. `spec/01-error-manage/`)
     - `coding-guidelines/XX-error-manage/` (e.g.
       `coding-guidelines/01-error-manage/`)
     - Any similarly named error-management folder inside `spec/` or
       `coding-guidelines/` (`XX` = a zero-padded sequence: `01`,
       `02`, …).
     - For any coding task, the error-management rules are not
       optional: read them and apply them (logging, error surfacing,
       retries, failure handling) to every step that touches code.

2. **SEO tasks** (website/SEO-related). Check ALL three locations:
   - `.lovable/seo-guidelines.md` — single-file guideline.
   - `spec/seo-guidelines/` — folder; read every file inside.
   - `seo-guidelines/` at the **repo root** — folder; read every
     file inside.

Rule: verify the file/folder exists first. If it does not, skip
silently. When a folder is present, read every `.md` inside it (do
not stop at the first file).

---

Listen — past planning turns have been sloppy: wrong step count,
plans dumped into chat instead of files, plan-mode tool fired when I
explicitly said not to, user commands and bug reports forgotten by
the next turn. WTF. Stop doing that. Read the codebase, capture
commands and issues into their folders, count the steps, spin out
subtasks where depth is needed, write the plan file, move on. Going
deep IS the job — if you're not going deep, you're not doing the job.
