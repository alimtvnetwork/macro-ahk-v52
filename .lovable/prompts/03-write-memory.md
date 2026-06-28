# Write Memory (a.k.a. "End Memory")

> **Purpose:** Persist everything the AI learned, did, decided, and left undone in this session — so the next AI session (which has full amnesia) can resume with zero context loss.

## Must Write

Can you please update the root README file regarding how the folder structure is and which file the AI can read, and it can full project with attention, how it can create code, add unit test, add new feature, spec and everything. So all this file needs to be mentioned, in the root README and also mentioned in the, uh, .lovable folder inside the memory md file (.lovable/what-to-read.md). Add a file called what to read. Okay, do you understand? Can you please do this one?

Don't put any files to `mem://` directly save all files to specific folder.

> **Trigger phrases:** `write memory` · `end memory` · `update memory` · end of a task batch

---

## 0. Pre-flight — Read Before You Write

Before doing anything, the AI **must** read these files (if they exist) to ground itself:

1. `.lovable/memory/index.md` — master index of memory
2. `.lovable/coding-guidelines.md` — project coding rules (see §10 below)
3. `.lovable/plan.md` — active roadmap
4. `.lovable/suggestions.md` — open and closed suggestions
5. `.lovable/strictly-avoid.md` — hard prohibitions
6. `.lovable/cicd-index.md` — CI/CD issue index
7. `.lovable/prompts/index.md` — prompt registry
8. `.lovable/memory/workflow/` — current workflow state
9. Any `spec/` or `spec/error-manage/` folder if present

If any of the above is missing, **create it** as part of this run (see §10 and §11 for templates).

Also, **before writing**, ask the user (only if genuinely ambiguous):

- "Is there any conversation context I might be missing?"
- "Should I treat this batch as a milestone or a checkpoint?"

If nothing is ambiguous, proceed silently.

---

## 1. Core Principle

> The memory system is the project's brain. If you did something and didn't write it down, it didn't happen. If something is pending and you didn't record it, it will be lost. **Write as if the next AI has amnesia — because it does.**

Rules that override convenience:

- **Never lose conversation context.** Capture user prompts verbatim when they contain specs, decisions, or preferences.
- **Never delete history** — mark done, move to `## Completed`, never erase.
- **Never overwrite blindly** — always read before write.
- **Never leave orphans** — every file must be indexed.
- **Lowercase, hyphen-separated, numeric-prefixed filenames** (`01-thing-name.md`).
- **Never create `.lovable/memories/`** (with `s`). The correct path is `.lovable/memory/`.

---

## 2. Phase 1 — Audit the Session

Internally answer (do not dump to user unless asked):

**Done**

- Every task completed (features, fixes, refactors)
- Every file created / modified / deleted
- Every decision made and why

**Pending**

- Tasks started but unfinished
- Tasks discussed but not started
- Blockers / dependencies

**Learned**

- New patterns, conventions, gotchas
- User preferences (explicit or implicit)

**Wrong**

- Bugs and root causes
- Failed approaches
- Things to never repeat

---

## 3. Phase 2 — Update Memory Files

**Target:** `.lovable/memory/`

1. **Read** `.lovable/memory/index.md`. Do not create duplicates.
2. **Update existing files** — add new info in the right section, mark items `[x]` or `✅`, **never truncate unrelated entries**.
3. **Create new files** when a topic doesn't fit anywhere: `.lovable/memory/XX-descriptive-name.md` (XX = next sequence, starting `01`). **Immediately** add it to `index.md` in the same operation.
4. **Update workflow state** in `.lovable/memory/workflow/` with status markers:

| Status       | Marker                  |
| ------------ | ----------------------- |
| Done         | `✅ Done`               |
| In Progress  | `🔄 In Progress`        |
| Pending      | `⏳ Pending`            |
| Blocked      | `🚫 Blocked — [reason]` |
| Avoid / Skip | `🚫 Avoid — [reason]`   |

**Anything the user said to skip or avoid** goes into `.lovable/memory/avoid/XX-name.md` and is referenced from `.lovable/strictly-avoid.md`.

---

## 4. Phase 3 — Plans & Suggestions

### 4A. Plan — `.lovable/plan.md` (single file)

- Update task statuses.
- Add new tasks discovered this session.
- Move fully-complete items to a `## Completed` section at the bottom (do not delete).

### 4B. Suggestions — `.lovable/suggestions.md` (single file)

```markdown
## Active Suggestions

### [Title]
- **Status:** Pending | In Review | Approved | Rejected
- **Priority:** High | Medium | Low
- **Description:** what & why
- **Added:** [session ref]

## Implemented Suggestions

### [Title]
- **Implemented:** [session ref]
- **Notes:** details / commit / file
```

When implemented: move from Active → Implemented and add notes.

### 4C. Lovable suggestions folder

Capture all Lovable-originated suggestions verbatim into:

- `.lovable/suggestions/XX-suggestion-name.md`
- `.lovable/suggestions/index.md` (summary index)

These are in addition to `suggestions.md` (the high-level single file). Do not duplicate content — the per-file version is the verbatim capture, `suggestions.md` is the tracker.

---

## 5. Phase 4 — Issues

### 5A. Pending — `.lovable/pending-issues/XX-short-description.md`

```markdown
# [Issue Title]

## Description
## Root Cause (or "Under investigation")
## Steps to Reproduce
## Attempted Solutions
- [ ] Approach 1 — [result]
## Priority High | Medium | Low
## Blocked By (if any)
```

### 5B. Solved — `.lovable/solved-issues/XX-short-description.md`

On resolution, **move** the file and append:

```markdown
## Solution
## Iteration Count
## Learning
## What NOT to Repeat
```

### 5C. Strictly Avoid — `.lovable/strictly-avoid.md`

```markdown
- **[Pattern]:** [why forbidden]. See: `.lovable/solved-issues/XX-name.md`
```

---

## 6. Phase 5 — CI/CD Issues

Track every CI/CD issue encountered, **without duplication**.

- File: `.lovable/cicd-issues/XX-issue-name.md` (XX from `01`)
- Index: `.lovable/cicd-index.md` — short summary list of all CI/CD issues

Before adding a new one, scan the index to confirm it isn't already recorded.

---

## 7. Phase 6 — Capture Recent Specs Verbatim

If the user provided a sizeable spec, decision, or directive this session:

- Save the **verbatim** text to `.lovable/memory/specs/XX-spec-slug.md`
- Add a one-line summary in `.lovable/memory/index.md`
- If it changes the roadmap, also reflect in `plan.md`

Never paraphrase specs — quote them. The next AI must see what the user actually said.

---

## 8. Phase 7 — Consistency Validation

After all writes:

1. **Index integrity** — every file under `.lovable/memory/` (recursively) is listed in `index.md`.
2. **Cross-references** — every `✅ Done` in `plan.md` has evidence (memory entry, solved issue, or code change). Every actionable pending issue is reflected in `plan.md` or `suggestions.md`.
3. **No file** exists in both `pending-issues/` and `solved-issues/`.
4. **No orphans** — no memory file without an index entry; no "Implemented" suggestion without code evidence; no solved issue missing `## Solution`.

### Final response template

```
✅ Memory update complete.

Session Summary:
- Tasks completed: X
- Tasks pending: Y
- New memory files: Z
- Issues resolved: N
- Issues opened: M
- Suggestions added/implemented: S / T
- CI/CD issues recorded: C

Files modified:
- [list]

Inconsistencies fixed:
- [list or "None"]

Next session can resume from: [state + next logical step]
```

---

## 9. File Naming & Structure

| Rule                              | Example                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Numeric prefix                    | `01-auth-flow.md`                                                                                             |
| Lowercase + hyphen                | `03-error-handling.md` ✅ / `03_Error_Handling.md` ❌                                                         |
| Plans → single file               | `.lovable/plan.md`                                                                                            |
| Suggestions tracker → single file | `.lovable/suggestions.md`                                                                                     |
| Per-suggestion capture            | `.lovable/suggestions/XX-name.md` + `index.md`                                                                |
| Issues → one file each            | `.lovable/pending-issues/01-name.md`                                                                          |
| Memory grouped by topic           | `.lovable/memory/workflow/`, `.lovable/memory/decisions/`, `.lovable/memory/specs/`, `.lovable/memory/avoid/` |
| Completed items                   | `## Completed` section in same file (never a `completed/` folder)                                             |

### Canonical layout

```
.lovable/
├── overview.md
├── strictly-avoid.md
├── user-preferences.md
├── plan.md
├── prompt.md                       # references prompts/index.md
├── coding-guidelines.md
├── cicd-index.md
├── suggestions.md
├── suggestions/
│   ├── index.md
│   └── 01-name.md
├── prompts/
│   ├── index.md
│   └── 01-write-memory.md
├── memory/
│   ├── index.md
│   ├── workflow/
│   ├── decisions/
│   ├── specs/
│   ├── avoid/
│   └── [topic]/
├── pending-issues/
├── solved-issues/
└── cicd-issues/
```

**Restructure** any existing folder that doesn't match this layout (rename, move, re-index). Never delete content during restructure — move it.

---

## 10. Coding Guidelines — Must Exist

The AI **must** ensure `.lovable/coding-guidelines.md` exists. If missing, create it with the content below. If it exists, **enhance** it (merge, don't overwrite) and keep it lowercase-hyphenated.

The file must also explicitly list paths the AI should read on every coding task (e.g. `spec/`, `spec/error-manage/`, language-specific guidelines, Boolean guidelines, Enum guidelines, error-management guidelines).

### Required content (seed)

```markdown
# Coding Guidelines

> Read before writing any code. Also read: spec/, spec/error-manage/ (if present),
> language-specific guidelines, Boolean guidelines, Enum guidelines, error-management guidelines.

1. Functions ≤ 8 lines.
2. No nested ifs.
3. Ifs stay simple — prefer positive conditions, no negatives.
4. Follow Boolean guidelines: boolean names are prefixed `is` or `has`; no negative names.
5. Use proper types — never `any` / `unknown` / `interface{}` / wide-open types. `Generic<T>` is fine.
6. Never swallow errors — every `catch` logs per the error-management + logging guidelines.
7. No file or class > 80–100 lines.
8. No magic strings or numbers — use Enum or Constants.
9. Definitions live in their own files, not inline.
10. Reusability is the highest priority — keep code DRY.
11. React/TS components: as small as possible, reusable. For many components, draft a mermaid diagram in the plan first.
12. If `spec/error-manage/` exists, every error handler must follow it.
13. Prefer immutable, single-assignment variables (Rust-style). Mutate only loop indices or where strictly necessary.
14. Assets go in `/assets/XX-folder-name/XX-file-name.<ext>` with numeric sequence prefixes.
15. Enums and constants live in dedicated files, not inline.
```

If new rules emerge in a session, append them here and note them in `.lovable/memory/index.md`.

---

## 11. Prompt Registry

- This prompt lives at `.lovable/prompts/01-write-memory.md`.
- Maintain `.lovable/prompts/index.md` describing each prompt (id, title, trigger phrases, purpose).
- Maintain `.lovable/prompt.md` as a top-level pointer to `prompts/index.md`.
- When a new reusable prompt is added, create `.lovable/prompts/XX-name.md` and update the index in the same operation.

---

## 12. Anti-Corruption Rules (Hard)

1. Never delete history.
2. Never overwrite blindly — read first.
3. Never leave orphans — index everything.
4. Never split what should be unified (`plan.md`, `suggestions.md` stay single files).
5. Never mix states (pending vs solved, done vs in-progress).
6. Never skip an index update in the same op as a file creation.
7. Never assume the next AI knows anything.
8. Never act on this prompt unless the user explicitly triggers it.
9. Never lose conversation context — when in doubt, capture verbatim.

---

## 13. Meta — Improve This Prompt

At the end of every memory write, the AI should ask itself:

> "Did anything this session reveal a gap, ambiguity, or missing rule in this prompt?"

If yes:

1. Propose the improvement to the user in one short paragraph.
2. On approval, update `.lovable/prompts/01-write-memory.md` and bump a `## Changelog` entry at the bottom.
3. Reflect the change in `.lovable/prompts/index.md`.

---

## Changelog

- `v1` — initial enhanced version derived from the user's original "Write Memory" prompt.

---

title: Write Memory
slug: write-memory
