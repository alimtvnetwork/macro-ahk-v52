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

- [step-02](./step-02-four-tier-storage-decision-matrix.md) — storage tier boundaries.
- [step-25](./step-25-chrome-storage-local-usage.md) — extension-wide small JSON belongs in `chrome.storage.local`.
- [step-28](./step-28-cross-version-storage-migration.md) — migrations must not rewrite page-origin localStorage.
- [step-30](./step-30-sdk-content-script-contract.md) — MAIN-world bridge owns page-context access.
- Core memory: No Supabase, single-path `getBearerToken()`, no Storage PascalCase migration.
