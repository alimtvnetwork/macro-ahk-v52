# Macro-Prompts — Separation Rationale

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

`macro-prompts/` is a sibling of `prompts/` reserved for **template prompts that are only meaningful when invoked by a macro**. Keeping them separate stops the human-facing Prompts panel from being polluted with half-sentences that require runtime variable injection to make sense.

## When a prompt belongs in `macro-prompts/`

Add to `macro-prompts/` when **any** of these are true:

- The prompt declares one or more **Required** variables with no usable `Default` (a human running it standalone would hit `MissingVariable`).
- The prompt's purpose is a sub-step of a larger automated chain (audit, fix-from-audit, score-extract, gap-analysis).
- The prompt writes to `spec/audit/<RunId>/` and therefore needs a `RunId` from run context.
- The prompt is post-processing of another prompt's output (only meaningful as step N of a chain).

## When a prompt belongs in `prompts/` (the existing folder)

Keep in `prompts/` when **all** of these are true:

- A human can paste it into the chatbox with zero substitutions and get a sensible result.
- It has no Required variables, or every Required variable has a safe `Default`.
- It is discoverable as a standalone action in the Prompts panel.

## Hard rules

1. **No duplicate slugs across the two folders.** Build fails fast (`Reason="DuplicateSlug"`) — see `04-resolution-order.md`.
2. **Both folders aggregate at build time** into separate JSON bundles consumed by the extension; runtime resolver searches `macro-prompts/` first, then `prompts/`.
3. **Identity-only storage** — both bundles land in `chrome.storage.local` under the existing `Prompts.*` and new `MacroPrompts.*` namespaces. No Supabase. No PascalCase migration of legacy keys (see `mem://constraints/no-storage-pascalcase-migration`).
4. **Versioning** is unified with the rest of the extension (see `mem://workflow/versioning-policy`).
