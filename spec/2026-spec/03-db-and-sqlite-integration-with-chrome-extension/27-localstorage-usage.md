# Step 27 — localStorage Usage

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

The repeated failure pattern is treating `localStorage` as if it were a general extension persistence tier. It is not: MV3 service workers cannot access it, content scripts read the page's origin store rather than an extension-wide store, and it is synchronous enough to freeze page scripts if abused. The fix is to make `localStorage` a **narrow page-context bridge only**, never an authoritative storage backend.

## Goal

Define exactly where `localStorage` is allowed, where it is forbidden, and how reads must fail safely without reintroducing legacy auth paths or storage migrations.

## Required files

- `standalone-scripts/marco-sdk/src/auth-token-utils.ts` — only permitted direct token lookup helper, still behind the single `getBearerToken()` contract.
- `standalone-scripts/marco-sdk/src/auth.ts` — public SDK auth entry point; must not expose raw storage probing.
- `standalone-scripts/marco-sdk/src/kv.ts` — must use background KV APIs, never page `localStorage`.
- `src/background/**` — must not reference `localStorage` because MV3 service workers do not provide it.
- `src/content-scripts/**` — must not persist durable extension data in `localStorage`; if a content script needs page data, it must request it through a MAIN-world bridge.
- `scripts/check-no-background-localstorage.mjs` — CI guard rejecting `localStorage` usage under `src/background/`.

No new package is required.

## Decision table

| Need | Use | Never use |
|---|---|---|
| Durable extension records | SQLite via OPFS waterfall | `localStorage` |
| Extension settings / small JSON | `chrome.storage.local` wrappers | `localStorage` |
| Derived script bytes | IndexedDB injection cache | `localStorage` |
| Page-origin auth handoff | `getBearerToken()` only | ad-hoc `localStorage.getItem()` scattered across SDK files |
| One-page UI flag with no extension meaning | in-memory variable first; page `localStorage` only if page contract already owns the key | background DB / SQLite |

## Canonical helper shape

The SDK may inspect page-origin storage only inside a small allowlisted helper. It must not create a second public auth path.

```ts
type TokenProbeResult = {
    token: string | null;
    source: "page-localstorage" | "missing";
    reason: string;
};

const AUTH_TOKEN_KEYS = [
    "lovable.auth.token",
    "riseup.auth.token",
] as const;

function readAllowedPageToken(): TokenProbeResult {
    if (typeof window === "undefined" || window.localStorage === undefined) {
        return {
            token: null,
            source: "missing",
            reason: "LocalStorageUnavailableInCurrentContext",
        };
    }

    for (const key of AUTH_TOKEN_KEYS) {
        const value = window.localStorage.getItem(key);
        if (value !== null && value.trim() !== "") {
            return {
                token: value,
                source: "page-localstorage",
                reason: `MatchedAllowlistedKey:${key}`,
            };
        }
    }

    return {
        token: null,
        source: "missing",
        reason: "NoAllowlistedTokenKeyMatched",
    };
}
```

Rules:

1. **Single-path auth remains mandatory.** Public callers use `getBearerToken()` only; never expose `readAllowedPageToken()`.
2. **No Supabase keys.** Do not read or write Supabase-style `sb-*` keys, SDK objects, refresh tokens, or provider sessions.
3. **No writes by default.** Page `localStorage.setItem()` requires a written contract naming the owner, key, lifetime, and migration policy.
4. **No background usage.** `src/background/**` must have zero `localStorage` references.
5. **No durable user data.** Projects, scripts, prompts, logs, errors, and cache bytes never live in `localStorage`.
6. **No JSON blobs over 2 KiB.** If a page-owned flag grows beyond that, move it to IndexedDB or `chrome.storage.local` depending on scope.

## CI guard

```js
// scripts/check-no-background-localstorage.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { globSync } from "glob";

const ROOT = process.cwd();
const files = globSync("src/background/**/*.{ts,tsx,js,mjs}", { cwd: ROOT });
const offenders = files.filter((file) => {
    const text = readFileSync(join(ROOT, file), "utf8");
    return /\blocalStorage\b/.test(text);
});

if (offenders.length > 0) {
    console.error("localStorage is forbidden in MV3 background code:");
    for (const file of offenders) {
        console.error(`- ${file}`);
    }
    process.exit(1);
}
```

Wire this into the same prebuild chain as the storage PascalCase guard from step-25.

## Error model

| Failure | Reason | Logger tag | User-visible surface |
|---|---|---|---|
| `localStorage` unavailable | `LocalStorageUnavailableInCurrentContext` | `RiseupAsiaMacroExt.Logger.error("Auth.LocalStorageProbe", ...)` only if auth fails completely | none if another auth source succeeds |
| Allowlisted key missing | `NoAllowlistedTokenKeyMatched` | debug trace only; not Code Red | normal signed-out state |
| Background file references `localStorage` | `ForbiddenBackgroundLocalStorage` | CI failure with exact path | build fails |
| Supabase-style key detected | `ForbiddenSupabaseStorageKey` | CI failure with exact key pattern | build fails |

Failure logs MUST include `Reason` and `ReasonDetail`; if the key name is sensitive, log the allowlist index rather than the full value.

## Acceptance

- [ ] `rg "\blocalStorage\b" src/background` returns no matches.
- [ ] `standalone-scripts/marco-sdk/src/auth-token-utils.ts` is the only file allowed to read auth-ish page `localStorage` keys.
- [ ] No code reads `sb-*` storage keys or imports Supabase auth helpers.
- [ ] New CI guard fails if any background file references `localStorage`.
- [ ] SDK auth tests cover unavailable `window`, missing key, blank key, and matched allowlisted key.
- [ ] No project/script/prompt/log/error record is serialized into `localStorage`.

## Cross-references

- [step-02](./02-four-tier-storage-decision-matrix.md) — storage tier boundaries.
- [step-25](./25-chrome-storage-local-usage.md) — extension-wide small JSON belongs in `chrome.storage.local`.
- [step-28](./28-cross-version-storage-migration.md) — migrations must not rewrite page-origin localStorage.
- [step-30](./30-sdk-content-script-contract.md) — MAIN-world bridge owns page-context access.
- Core memory: No Supabase, single-path `getBearerToken()`, no Storage PascalCase migration.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, quotas, retention, byte caps, chunk sizes) to a named constant declared in `spec/2026-spec/01-prompt-spec/reference/05-runtime-defaults.md` or a local `reference/*-defaults.md` file. Inline literals are rejected.
- **MUST** keep `chrome.storage.local` per-key payloads ≤ `CHROME_STORAGE_LOCAL_PER_KEY_BYTES` (8 192) and aggregate writes ≤ `CHROME_STORAGE_LOCAL_TOTAL_BYTES` (10 485 760). Larger payloads route to IndexedDB or SQLite.
- **MUST** await `navigator.storage.persist()` once at boot, log the resolved boolean via `RiseupAsiaMacroExt.Logger.info`, and surface `{ persisted, usage, quota }` in diagnostics — no fire-and-forget.
- **MUST** classify every DB failure with a stable `Reason` code (see `31-error-model.md`) plus `ReasonDetail`, and route it through `Logger.error` — never `console.error` and never silently swallow.

## Pitfalls / Counter-examples

- ❌ `catch (e) { /* ignored */ }` around `db.exec()` — masks corruption; the error-swallow audit (`public/error-swallow-audit.json`) will fail CI. ✅ Re-throw after `Logger.error` with full SQL + bind context.
- ❌ Calling `db.run` on a new-tab/blank URL because the auto-injector did not gate the URL. ✅ Use `isNewTabOrBlankUrl()` from `src/shared/url-utils.ts` before scheduling any DB-bound work.
- ❌ Hardcoding `Asia/Kuala_Lumpur` (or any zone) when persisting timestamps. ✅ Store `Date.now()` as UTC ms; render with `Intl.DateTimeFormat(undefined, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })`.
- ❌ Treating `chrome.storage.local.set` as synchronous and reading back in the next line. ✅ Always `await` the Promise (MV3) and verify the write via `storage.local.get` in tests.
- ❌ Retrying a failed migration with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy` — surface a Boot Failure Banner (`34-boot-failure-banner.md`) and require user action.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

