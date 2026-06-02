# Error Management

## Overview

End-to-end error-handling contract: resolution flow (`01-error-resolution/`), runtime architecture (`02-error-architecture/`), and the canonical error-code registry (`03-error-code-registry/`). Pairs with the mandatory failure-log shape in `mem://standards/verbose-logging-and-failure-diagnostics` and the namespace-logger rule in `mem://standards/error-logging-via-namespace-logger.md`.

CI gates: `scripts/audit-error-swallow.mjs` (P0/P1/P2 swallow audit) and `scripts/check-swallow-baseline-monotonic.mjs` (baseline never grows).

## Files
- [`00-overview.md`](./00-overview.md)
- [`97-acceptance-criteria.md`](./97-acceptance-criteria.md)
- [`98-changelog.md`](./98-changelog.md)
- [`99-consistency-report.md`](./99-consistency-report.md)

## Subdirectories
- [`01-error-resolution/`](./01-error-resolution/) — diagnose → fix → verify flow
- [`02-error-architecture/`](./02-error-architecture/) — runtime layers + BootFailureBanner
- [`03-error-code-registry/`](./03-error-code-registry/) — canonical Reason codes
