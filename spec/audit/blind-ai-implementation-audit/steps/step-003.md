# Step 3 — `09-exceptions.md` vs `mem://constraints/readme-txt-prohibitions`

**Time:** ~2 min · **Severity:** Med

- **Sources:** `spec/01-spec-authoring-guide/09-exceptions.md`, memory rule SP-1..SP-7.
- **Blind-AI likely output:** If only reading spec, the LLM would follow `09-exceptions.md`. If only reading memory, it would follow SP-1..SP-7. The two must mirror, or drift creates contradictions.
- **Actual:** Memory states "mirrors strictly-avoid.md and spec/01-spec-authoring-guide/09-exceptions.md" — assumption is parity.
- **Gap:** Need byte-level diff verification. A blind AI cannot tell whether the spec was last updated to match the memory's SP-1..SP-7 sequence. No automated parity test exists.
- **Recommendation:** Add a vitest that asserts the SP-1..SP-7 IDs and titles appear in both files, OR fold one into the other and link.
