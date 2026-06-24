---
title: Next task with number
slug: next-task
saved-as: 41-next-task.md
---

# Next ${N} Steps or Tasks (v5)

Use this prompt when the user provides a long instruction plus a number N. Produce exactly N next steps/tasks with reasoning, time estimate, and what each step unblocks; then list every remaining item after those N so the full backlog is visible. For coding tasks, read project memories, coding guidelines, and relevant files first; write the one-sentence root cause before fixing; make the minimum correct change; verify failing-to-passing signal; report what changed and why. At task completion, bump version, update changelog/release notes/root readme pin when applicable, and keep this prompt mirrored in `.lovable/prompts/xx-next-task.md`.