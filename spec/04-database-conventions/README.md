# Database Conventions

## Overview

Database authoring rules across all 4 storage tiers (SQLite, IndexedDB, localStorage, `chrome.storage.local` — see `mem://architecture/data-storage-layers`). Covers naming (`01-naming-conventions.md`), schema design (`02-schema-design.md`), ORM + views (`03-orm-and-views.md`), test strategy (`04-testing-strategy.md`), relationship diagrams (`05-relationship-diagrams.md`), REST API formatting (`06-rest-api-format.md`), and the split-DB pattern (`07-split-db-pattern.md`, expanded in `spec/05-split-db-architecture/`).

Hard ban: never rewrite `StoredProject` keys to PascalCase (`mem://constraints/no-storage-pascalcase-migration`).

## Files
- [`00-overview.md`](./00-overview.md)
- [`01-naming-conventions.md`](./01-naming-conventions.md)
- [`02-schema-design.md`](./02-schema-design.md)
- [`03-orm-and-views.md`](./03-orm-and-views.md)
- [`04-testing-strategy.md`](./04-testing-strategy.md)
- [`05-relationship-diagrams.md`](./05-relationship-diagrams.md)
- [`06-rest-api-format.md`](./06-rest-api-format.md)
- [`07-split-db-pattern.md`](./07-split-db-pattern.md)
