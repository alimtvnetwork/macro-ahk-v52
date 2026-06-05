# Conversation Log — Pre-Action Wrapper for Any Follow-up Prompt

> **Purpose:** Before acting on the *next* prompt the user pastes, the AI must (a) persist the full chat so far to disk as a numbered Markdown log, (b) rewrite and improve the user's follow-up prompt in place, (c) confirm that the project's coding guidelines are captured in memory, and (d) surface any ambiguity. The AI does **NOT** execute the follow-up prompt yet.

> **When to run:** The user pastes this prompt and says some variant of "here is the prompt, don't act on it yet" or "rewrite it first". After the AI completes all steps below and the user explicitly says "go" / "now act" / "execute", the AI may then run the rewritten prompt.

---

## Hard Rules

1. **DO NOT ACT** on the follow-up prompt the user provides after this one. No file edits, no commands, no implementation. Rewrite-and-stage only.
2. **DO NOT** invent facts about the conversation. If something is unclear, list it under *Ambiguities* and ask.
3. Conversation log files are **append-only artefacts** — never rewrite or renumber existing files in `conversation/`.
4. All file/folder names use kebab-case with a zero-padded 3-digit numeric prefix (e.g. `001-initial-scoping.md`).
5. Honor every Core rule in `mem://index.md` (timezone, no-Supabase, dark-only, etc.) when generating any artefact.

---

## Phase 1 — Persist the Conversation

**Target folder:** `conversation/` at repo root (create if missing).

**File naming:** `NNN-hyphen-title-slug.md` where:
- `NNN` = next available 3-digit sequence (scan existing files; do not collide).
- `hyphen-title-slug` = short kebab-case summary of the dominant topic of that chunk (≤ 6 words).

**Chunking policy:**
- One file per logical user-driven topic shift, OR per session if the session stayed on one topic.
- If the entire prior history is one topic, write one file (e.g. `001-bootstrap-session.md`).

**File contents (Markdown):**
```markdown
# <Title>

**Sequence:** NNN
**CapturedUtc:** YYYY-MM-DDTHH:MM:SSZ
**Span:** <user-message-count> user prompts
**Topic:** <one-line summary>

---

## User Prompts (verbatim)

### 1.
> <verbatim user prompt #1>

### 2.
> <verbatim user prompt #2>

...

---

## Assistant Actions Summary (one bullet per turn, no chain-of-thought)
- <short factual recap>
- ...

---

## Outcomes / Decisions
- <decision or artefact produced>

## Open Threads (carry-over)
- <anything not yet resolved>
```

**Rules:**
- User prompts are **verbatim** (preserve typos, casing, punctuation). Wrap each in a blockquote.
- Assistant side is a **terse factual summary only** — never paste internal reasoning, never invent quotes.
- Use UTC ISO-8601 for stored timestamps; render local time only in UI.
- If you cannot recall a prior user prompt with confidence, write `> [unrecoverable — see chat history index N]` rather than guessing. Use `chat_search` tools to recover when possible.

---

## Phase 2 — Cross-check Memory & Coding Guidelines

1. Read `mem://index.md` and confirm the following exist; if any is missing, **propose** (do not auto-create unless the user confirms):
   - A `coding-guidelines` memory entry mirroring `.lovable/coding-guidelines.md`. If the file exists on disk but no memory entry references it, draft a `mem://standards/coding-guidelines.md` stub and list it under *Proposed Memory Writes* below.
   - `plan.md` reference (roadmap source of truth).
   - Conversation-log convention (this very prompt) — propose `mem://workflow/conversation-log` if absent.
2. List every relevant memory file the follow-up prompt would touch, so the user can audit before approval.

---

## Phase 3 — Rewrite the Follow-up Prompt

Take the user's pasted follow-up prompt and produce an **improved, unambiguous, AI-ready** version. Rules:

- Preserve original intent exactly. Do not add scope.
- Add explicit references to: `plan.md`, `mem://index.md`, `.lovable/coding-guidelines.md`, and any other file the task clearly depends on.
- Convert vague phrasing into checklists, acceptance criteria, and file paths.
- Call out inputs, outputs, and the *Definition of Done*.
- End the rewritten prompt with a self-instruction: **"Before acting, re-read `mem://index.md` and `.lovable/coding-guidelines.md`; restate which rules apply."**
- Ask the AI (in the rewritten prompt itself) to suggest further improvements to *this* instruction after execution.

**Save the rewrite to:** `prompts/NNN-<slug>.md` at repo root (3-digit prefix, kebab slug derived from the prompt's title). Do not overwrite existing files — pick the next free `NNN`.

**Also update:** `prompts/index.md` (create if missing). Format:

```markdown
# Prompts Index

| # | File | Title | Purpose | Status |
|---|------|-------|---------|--------|
| 001 | [001-...](./001-....md) | ... | ... | active |
```

Append the new row; never rewrite history.

---

## Phase 4 — Report Back (single chat reply)

Reply to the user with **exactly** these sections, in this order:

1. **Conversation files written** — list paths + sequence numbers.
2. **Memory check** — what exists, what's missing, what you propose to add (with file paths).
3. **Rewritten prompt** — path under `prompts/` plus a short diff-style summary of changes (what you added, what you tightened).
4. **Ambiguities / Questions** — anything you couldn't resolve. If none, write `None — ready to execute on your "go".`
5. **Next step** — explicit sentence: *"Awaiting your explicit 'go' before executing the rewritten prompt at `prompts/NNN-<slug>.md`."*

---

## Failure Modes to Avoid

- ❌ Executing the follow-up prompt instead of staging it.
- ❌ Paraphrasing user prompts in the conversation log (must be verbatim).
- ❌ Renumbering or editing existing `conversation/NNN-*.md` files.
- ❌ Silently creating new memory entries without listing them under *Proposed Memory Writes*.
- ❌ Skipping the index update at `prompts/index.md`.
- ❌ Asking the user vague/context-free questions (per `mem://preferences/question-asking-style` — always include recommendation + pros/cons).

---

## Acknowledgement Required

Begin your reply with one line: **"Understood — staging only, not executing."** Then proceed through Phases 1–4.
