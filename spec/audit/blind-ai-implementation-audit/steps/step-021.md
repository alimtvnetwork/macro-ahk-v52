# Step 21 — `spec/04-database-conventions` vs SQLite schema

**Time:** ~2 min · **Severity:** Low

- **Sources:** `spec/04-database-conventions/` (00 overview, 01 naming, 02 schema, 03 ORM, 04 testing, 05 diagrams, 06 REST format, 07 split-db).
- **Blind-AI likely output:** Folder is well-scaffolded — LLM can author tables conforming to PascalCase + relationship rules.
- **Actual:** All 8 required documents present; consistency report exists.
- **Gap:** No auto-generated `schema.sqlite.dump.md` snapshot to compare current SQLite vs spec; drift detectable only by hand.
- **Recommendation:** Add `scripts/dump-sqlite-schema.mjs` that emits `spec/04-database-conventions/runtime-schema-snapshot.md` and a CI test that fails if checked-in snapshot diverges from current schema.
