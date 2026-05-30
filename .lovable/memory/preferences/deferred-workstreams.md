---
name: Deferred workstreams
description: Only P Store remains deferred (discuss-later). Manual Chrome E2E and React component test bans LIFTED 2026-05-25.
type: preference
---

## Active deferrals

- **P Store spec / submission** — discuss-later mode. Do NOT list, recommend, or
  surface in `next` rotations. User will raise it explicitly when ready.

## Lifted 2026-05-25 (per user)

- ~~Manual Chrome extension smoke test~~ — REMOVED from deferred list. Do not
  auto-recommend, but no longer forbidden if explicitly requested.
- ~~React component tests~~ — LIFTED. See `mem://preferences/test-with-features`:
  add tests alongside features as they're implemented going forward.
- ~~Cross-Project Sync v2 / Prompt Click E2E~~ — no longer auto-deferred; treat
  as normal backlog items.

**Why:** User explicitly narrowed the deferral scope and adopted a
test-as-you-build policy.
