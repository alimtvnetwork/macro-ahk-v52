# Spec-hardening backlog (post-T120)

Opened 2026-06-02. The 120-task `2026-spec`
spec is complete; this is the follow-on punch-list.

- [x] H1 — Banlist linter (`scripts/lint-spec-banlist.mjs`) — enforces T24 vocabulary ban.
- [x] H2 — Wire H1 + H6–H8 into `package.json` (`check:spec-banlist`, `check:spec-prompts-xrefs`, `spec:prompts:acceptance`, `spec:prompts:pdf`).
- [x] H3 — Top-level `spec/2026-spec/01-prompt-spec/README.md` mirroring the T120 read-order.
- [x] H4 — JSON-Schema validator for `info.json` examples (`scripts/check-prompts-info-json.mjs`, zero-dep).
- [x] H5 — Mermaid lint (`scripts/lint-spec-mermaid.mjs`, zero-dep: directive + bracket balance + tab check).
- [x] H6 — Combined spec bundle generator (`scripts/build-spec-prompts-pdf.mjs`) → `/mnt/documents/2026-prompts-spec.md`.
- [x] H7 — Cross-link audit (`scripts/check-spec-prompts-xrefs.mjs`).
- [x] H8 — Acceptance-bullet extractor (`scripts/extract-prompts-acceptance.mjs`) → `/mnt/documents/2026-prompts-acceptance.md`.
- [x] H9 — Reference-snippet typecheck harness (`scripts/typecheck-spec-snippets.mjs`, extracts `\`\`\`ts` blocks + shimmed tsc --noEmit).
- [x] H10 — Vanilla-HTML host-wiring PoC (`poc/2026-spec/index.html`) — wires snippets 01/02/03/05 + in-memory QueueStore against a mock chat host.

## Acceptance

- [ ] The implementation satisfies the `Spec-hardening backlog (post-T120)` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](reference/05-runtime-defaults.md); see also [related](README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

