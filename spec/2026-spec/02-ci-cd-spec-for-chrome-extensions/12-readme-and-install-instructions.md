# 12 — README Rules, Template & Unpacked-Load Instructions

> Mandatory README writing rules, canonical template, and unpacked-load instructions.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §29. README writing rules

Each extension's README must:
- Lead with one-line install commands (PowerShell + Bash).
- Show the unpacked-load steps verbatim.
- Link to the latest Release page.
- Never reference a specific version — use `latest` so the doc never goes stale.
- Use a hero image (`./assets/hero.png`) above the install block.


---

## §30. README template

```markdown
# <Extension Name>

> <one-sentence value prop>

![hero](./assets/hero.png)

## Install (one line)

**Windows (PowerShell):**
\`\`\`powershell
iwr -useb https://github.com/<owner>/<repo>/releases/latest/download/install.ps1 | iex
\`\`\`

**macOS / Linux (Bash):**
\`\`\`bash
curl -fsSL https://github.com/<owner>/<repo>/releases/latest/download/install.sh | bash
\`\`\`

## Manual install (unpacked)

1. Download `<slug>-<version>.zip` from the [latest release](https://github.com/<owner>/<repo>/releases/latest).
2. Unzip it.
3. Open `chrome://extensions`, enable **Developer mode**.
4. Click **Load unpacked** and select the unzipped folder.

## About
…
```


---

## §31. Unpacked-load instructions (canonical)

Always include the four-step block from §30 verbatim — same wording across
every extension README so users learn the flow once.

## Acceptance

- [ ] The implementation satisfies the `12 — README Rules, Template & Unpacked-Load Instructions` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
- [ ] Verification passes when `npm run test:cicd-spec` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

