# Architecture

## Overview

Cross-cutting architectural decisions and constraints that govern the whole codebase. Currently scoped to: read-only folders policy (`readonly-folders.md`) which documents the `skipped/**` + `.release/**` ban and the `readonly-paths-guard.yml` CI workflow. Additional architectural decisions live in `mem://architecture/*` entries (script-injection lifecycle, storage tiers, message relay, instruction dual-emit, etc.) — this directory is the spec-side anchor for those memory rules.

## Files
- [`readonly-folders.md`](./readonly-folders.md) — `skipped/` and `.release/` are read-only archives; CI guard enforced
