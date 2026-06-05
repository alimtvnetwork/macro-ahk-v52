# Quarantine — Inventory & Graduation Policy

> Holding area for spec drafts that are NOT yet ready for blind-AI implementation. Files here are intentionally excluded from the canonical audit score and from cross-folder owner enforcement.

Owner: see [Documentation standards](mem://workflow/documentation-standards) for the authoritative rule.

---

## Acceptance

- [ ] Every `.md` file under `spec/2026-spec/_quarantine/` (other than this `README.md`) MUST include a `## Graduation Plan` section with: (a) target folder, (b) blocker list, (c) owner mem:// link, (d) target date or "indefinite".
- [ ] `node scripts/audit/check-quarantine.mjs` MUST stay green; it fails when a quarantined file lacks a graduation plan.
- [ ] When a file graduates, it MUST be moved to its target folder and removed from this directory in the same change.

## Pitfalls

- **Anti-pattern: silent quarantine.** Adding a draft here without a Graduation Plan creates orphan rules. The audit script rejects this.
- **Anti-pattern: indefinite drift.** Files marked "indefinite" MUST still link a tracking issue or mem:// rationale so future maintainers know why.
- **Counter-example:** Do not link to quarantined files from canonical specs; they are not part of the contract surface.

## Current inventory

_None._ The 2026-06-05 audit pass graduated every draft into its canonical folder. Re-introduce this section as a table only when a new draft is parked here:

| File | Target folder | Owner | Blockers | Target date |
|---|---|---|---|---|

## Graduation checklist (per file)

1. Open the file's `## Graduation Plan` section and confirm every blocker is closed.
2. Move the file to its target folder; preserve the leading numeric prefix or assign the next free one.
3. Append the file to the destination folder's `README.md` index in numeric order.
4. Run `node scripts/audit/render-reports.mjs` and the full audit suite — every gate MUST stay green.
5. Delete the (now-empty) entry from the inventory table above.
