# 11 — No-Committed-ZIPs Hard Rule

> Strict ban on committing build artifacts plus the `.gitignore` enforcement contract.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §26. ⛔ Strict rule — never commit asset ZIPs

> **No `.zip`, `.crx`, `.xpi`, or built `dist/` artifact may ever be committed
> to the repository.** Artifacts live only on the GitHub Release page.
> Violations must fail CI immediately.

Rationale: binary diffs bloat history, leak unsigned builds, and cause
confusion about which artifact is authoritative.


---

## §27. `.gitignore` enforcement

```gitignore
# build/release outputs — release artifacts live only on the Releases page
release-assets/
*.zip
*.crx
*.xpi
dist/
node_modules/
```

Add a CI gate: `git ls-files | grep -E '\.(zip|crx|xpi)$' && exit 1`.

