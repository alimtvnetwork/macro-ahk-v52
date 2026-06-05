# Step 53 — Message relay 3-tier system

**Timestamp:** 2026-06-02
**Spec:** `04-architecture/03-message-relay.md`
**Memory:** `mem://architecture/message-relay-system`

## Reasoning
Cross-context messaging is the highest-blast-radius surface. Background ⇄ ISOLATED ⇄ MAIN must round-trip without orphaned listeners (cf. timer-and-observer-teardown).

## Findings
- ✅ `message-registry.ts`, `message-router.ts`, `message-tracker.ts`, `message-buffer.ts` show a deliberate architecture.
- 🟡 **Med**: no central typed message catalog exported as a discriminated union — blind LLM may invent message `type` strings.
- 🟢 **Low**: `message-buffer.ts` exists but no test asserts buffer drains on context recovery.

## Recommendation
Generate `MessageKind` discriminated union from a registry constant; expose to all three worlds via a shared `types/messages.ts`.
