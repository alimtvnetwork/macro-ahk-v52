# `next` response template

Use this skeleton when the user types `next` (or `next N`).

## Required shape
1. **Reasoning (1–2 sentences)** — why these tasks are next.
2. **Time estimate** — rough minutes per task or batch total.
3. **Execute** — actually do the work in the same turn (never just announce).
4. **Files changed** — bullet list.
5. **Remaining items** — flat numbered list `1. 2. 3. ...` with stable numbering.

## Hard rules
- Always DO the next task(s); never stage-only.
- Numbering must be flat integers, no decimals, no `Step 7`, no sub-bullets in the primary sequence.
- Keep numbering stable across turns until the task is `done`.
- If everything is done, recall prior chat + memory for leftovers and propose them numbered.

## Example skeleton
```
Reasoning: <one short paragraph>.
Estimated time: <N> min.

<execute the work>

Files changed:
- <path>

Remaining:
1. <task>
2. <task>
```
