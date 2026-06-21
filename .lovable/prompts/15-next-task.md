---
title: Next task 15 — url-trigger sentinel inject hard-error flood
slug: next-task-15
version: v3.80.0
---

# Next task 15

Same body as `12-next-steps-v7.md` — see that file for the canonical v7 prompt template. This file just records that task #15 (delivered in v3.80.0) used it to ship the `url-trigger` sentinel-inject silent-restricted fix:

- Root cause: `injectSentinel()` re-logged every Chrome `"Cannot access contents of the page"` refusal as a hard `MARCO_ERROR`, even on tabs that are post-hoc restricted (NTP remote content, prerendered/discarded tabs, PDFs, in-flight nav). The upfront `isRestrictedUrl()` guard cannot see those.
- Fix: catch the well-known refusal messages and call `clearTabDecision(tabId)` silently instead of `logCaughtError(...)`. Unrelated errors still surface unchanged.
- File: `src/background/url-trigger.ts` lines 241-265.
- Version: bumped 3.79.3 → 3.80.0 (manifest, constants, shared-state, all instruction.ts, version.json, readme pins).
- Changelog: top entry in `changelog.md`.
