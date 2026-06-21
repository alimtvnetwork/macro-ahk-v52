---
title: Move-to-Workspace Castle fix
slug: next-task
saved-as: 40-next-task.md
---

Invocation that shipped v3.104.0: added Castle.io `x-castle-request-token` header to PUT `/projects/:id/move-to-workspace` via new `castle-token.ts` helper (MAIN-world `window._castle('createRequestToken')`), wired through `ws-move.ts` `executeMove()`, and wrote `spec/workspace-move/00-api-contract.md`.
