---
name: Skipped and Release folder policy
description: Never modify skipped/ or .release/ folders — they are read-only archives
type: constraint
---
`skipped/` folders are read-only archives. Do not read, modify, or reference files there.
`.release/` folder must never be modified — keep out of reach of all AI agents.
**Why:** These contain frozen snapshots and release artifacts that must remain immutable.
