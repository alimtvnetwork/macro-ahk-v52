# Split-DB Architecture

## Overview

Multi-database architecture spec: splitting a single logical schema across multiple physical databases for isolation, scale, or per-project provisioning. Pairs with `spec/04-database-conventions/07-split-db-pattern.md` (the pattern) and `mem://architecture/data-storage-layers` (the 4-tier model). Tracks open issues (`03-issues/`), feature breakdowns (`02-features/`), and historical acceptance criteria (`96-…-legacy.md`).

## Files
- [`00-overview.md`](./00-overview.md), [`01-fundamentals.md`](./01-fundamentals.md)
- [`96-acceptance-criteria-legacy.md`](./96-acceptance-criteria-legacy.md), [`97-acceptance-criteria.md`](./97-acceptance-criteria.md), [`98-changelog.md`](./98-changelog.md), [`99-consistency-report.md`](./99-consistency-report.md)

## Subdirectories
- [`02-features/`](./02-features/) — feature-level split-DB specs
- [`03-issues/`](./03-issues/) — open + closed issues
