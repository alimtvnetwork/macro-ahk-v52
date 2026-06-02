# Import / Export

## Overview

Spec for the import + export pipeline (macros, projects, prompts, settings). Covers root-cause analysis of past failures (`01-rca.md`), the entity-relationship diagram (`02-erd.md`), and the regression test plan (`03-test-plan.md`). Export honors the storage-tier model in `mem://architecture/data-storage-layers` and MUST NOT rewrite `StoredProject` keys (`mem://constraints/no-storage-pascalcase-migration`).

## Files
- [`01-rca.md`](./01-rca.md)
- [`02-erd.md`](./02-erd.md)
- [`03-test-plan.md`](./03-test-plan.md)
