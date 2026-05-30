---
name: Namespace database creation spec
description: Dot-separated PascalCase namespaces, System.*/Marco.* reserved, 25 max user DBs, inline creation form with live validation
type: feature
---
- Spec at `spec/11-chrome-extension/90-namespace-database-creation.md`
- Namespace format: `^[A-Z][a-zA-Z0-9]*(\.[A-Z][a-zA-Z0-9]*){1,4}$` (2–5 PascalCase segments, 3–100 chars)
- Reserved prefixes: `System.*` and `Marco.*` — rejected with clear error
- Max 25 user-created databases per project (defaults don't count)
- Database kinds: KeyValue (auto-creates KeyValueStore), Relational (empty), Config (auto-creates ConfigStore)
- Inline creation form in Database panel with live validation
- `CreateDatabaseForm` component at `src/components/options/project-database/CreateDatabaseForm.tsx`
- Validation: `validateNamespace()` and `validateDatabaseName()` in `src/types/default-databases.ts`
