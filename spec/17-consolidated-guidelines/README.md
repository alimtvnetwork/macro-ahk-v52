# Consolidated Guidelines

## Overview

Single source of truth for cross-cutting engineering rules that every contributor (human or AI) must apply. This directory consolidates rules previously scattered across `02-coding-guidelines/`, `03-error-manage/`, `04-database-conventions/`, and design-system docs into one referenceable index. The companion CI gate `scripts/check-coding-guidelines-coverage.mjs` enforces that `.lovable/coding-guidelines.md` mirrors the rules listed here at ≥95% coverage.

Read this directory together with `spec/02-non-negotiables.md` (hard bans) and `mem://index.md` Core block (always-applied rules).

## Files
- [`00-overview.md`](./00-overview.md) — entry point and rationale
- [`99-consistency-report.md`](./99-consistency-report.md) — drift audit vs. the source dirs
