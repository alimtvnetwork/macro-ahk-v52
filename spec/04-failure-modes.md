# 04 — Failure Modes (Past LLM Mistakes)

Recurring drifts captured during the blind-AI audit (steps 1–110). Each row = a mistake an LLM has made on this repo more than once.

| ID | Drift | Why it happens | How to avoid |
|---|---|---|---|
| F-S5 | Coding guidelines under-enforced | LLM reads short `.lovable/coding-guidelines.md` only, misses `spec/17-consolidated-guidelines/` | Always cross-check both. CI gate `check-coding-guidelines-coverage.mjs`. |
| F-S6 | Memory rules ignored after long context | Core block scrolls off-screen | Re-read `mem://index.md` every 20 turns. |
| F-S13 | `console.error` slips in | Easier than `<NAMESPACE>.Logger.error` | ESLint `no-restricted-syntax` + `audit-logger-compliance.mjs`. |
| F-S27 | "OPFS logs" hallucination | Old memory entry claimed OPFS+SQLite | Source: SQLite ONLY. OPFS not implemented. |
| F-S60 | Missing timer/observer teardown | Install code copied without cleanup | Audit `scripts/audit-timer-teardown.mjs`. |
| F-S77 | `framer-motion` / `gsap` reintroduced | Default React snippet uses them | `scripts/check-forbidden-anim-libs.mjs` blocks at preinstall. |
| F-S81 | Two `plan.md` files diverge | `.lovable/plan.md` + root `plan.md` | Root is SOT; `.lovable/plan.md` is a 1-line pointer. |
| F-S88 | Edits inside `skipped/` or `.release/` | LLM treats them as live source | CI workflow `readonly-paths-guard.yml`. |
| F-S91 | Swallow baseline grows silently | Re-baseline on every push | `check-swallow-baseline-monotonic.mjs` blocks growth. |
| F-S93 | Phase 2b vs Phase 2c naming swap | Memory entry vs CI comment mismatch | Canonical = **Phase 2b**. |
| F-S95 | Spec gap not detected | No structural linter | `check-spec-readme-structure.mjs` requires H1+Overview+Files. |
| F-S97 | Spec range "00–08" hardcoded | Manual count drifted | `scripts/audit-spec-range.mjs` re-derives. |
| F-S98 | Deferred bans not lifted | Old "React tests deferred" note lingered | Only **P Store** is deferred (2026-05-25). |
| F-supabase | Supabase suggested as backend | LLM defaults to it | `mem://constraints/no-supabase`. |
| F-retry | Exponential backoff added | "Best practice" reflex | `mem://constraints/no-retry-policy`. Sequential fail-fast. |
| F-readme | Auto-update `readme.txt` timestamp | LLM "helpfully" adds time | SP-1..SP-7 hard ban. |

When you catch yourself about to do any of the above, stop and re-read the linked memory entry.

---

## Worked examples — copy-paste-ready

### F-S13 / Ban #9 — bare `console.error` → namespace logger

```ts
// ❌ BAD — bare console.error swallows project scope, fails CI audit.
try {
    await loadProject(slug);
} catch (caught) {
    console.error("load failed", caught); // F-S13 violation
}

// ✅ GOOD — namespace logger with exact path + reason.
import { Logger } from "<NAMESPACE>";

try {
    await loadProject(slug);
} catch (caught: unknown) {
    Logger.error(
        "loadProject",
        `Project '${slug}' failed to load from chrome.storage.local — slug missing or DB unreachable`,
        caught,
    );
    throw caught; // never swallow — see Ban #10
}
```

### F-retry / Ban #3 — exponential backoff → sequential fail-fast

```ts
// ❌ BAD — recursive retry with backoff (banned).
async function postWebhook(payload: WebhookPayload, attempt = 0): Promise<void> {
    try { await fetch(url, { method: "POST", body: JSON.stringify(payload) }); }
    catch (caught) {
        if (attempt < 5) {
            await new Promise(r => setTimeout(r, 2 ** attempt * 1000)); // ⛔ backoff
            return postWebhook(payload, attempt + 1);                   // ⛔ retry
        }
        throw caught;
    }
}

// ✅ GOOD — single attempt, fail-fast, structured log.
async function postWebhook(payload: WebhookPayload): Promise<void> {
    try {
        const response = await fetch(url, { method: "POST", body: JSON.stringify(payload) });
        if (!response.ok) {
            Logger.error("postWebhook", `HTTP ${response.status} from ${url} — single-attempt policy, not retrying`);
        }
    } catch (caught: unknown) {
        Logger.error("postWebhook", `Network failure posting to ${url} — single-attempt policy, not retrying`, caught);
        throw caught;
    }
}
```

### F-S60 / Ban #15 — timer without teardown

```tsx
// ❌ BAD — setTimeout leaks across unmount / pagehide.
useEffect(() => {
    setTimeout(() => setMessage(null), 3000);
}, [message]);

// ✅ GOOD — ref-tracked id, cleared on re-run, unmount, and pagehide.
const timerRef = useRef<number | null>(null);
useEffect(() => {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); }
    timerRef.current = window.setTimeout(() => setMessage(null), 3000);
    const onPageHide = () => {
        if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
        if (timerRef.current !== null) { window.clearTimeout(timerRef.current); }
        window.removeEventListener("pagehide", onPageHide);
    };
}, [message]);
```

### Storage routing — never rewrite `StoredProject` keys

```ts
// ❌ BAD — PascalCase migration (Phase 2c-storage v2, banned).
const migrated = { Slug: stored.slug, Name: stored.name };
await chrome.storage.local.set({ [stored.slug]: migrated });

// ✅ GOOD — identity-only mapping, preserve original camelCase keys.
const project: StoredProject = stored;
await chrome.storage.local.set({ [project.slug]: project });
```

### Failure-log JSON — mandatory shape

```json
{
    "Reason": "SelectorMiss",
    "ReasonDetail": "Primary XPath returned 0 nodes after 5000ms wait",
    "StepId": 17,
    "StepKind": "Click",
    "Phase": "Replay",
    "Timestamp": "2026-06-02T08:00:00+08:00",
    "SelectorAttempts": [
        {
            "selectorId": 42,
            "strategy": "XPathFull",
            "expression": "//button[@id='submit']",
            "matched": false,
            "matchCount": 0,
            "reason": "Element removed from DOM before evaluation"
        }
    ],
    "VariableContext": [
        {
            "name": "userEmail",
            "source": "DataSource.csv",
            "row": 3,
            "column": "email",
            "resolvedValue": "***@***.com",
            "type": "string",
            "reason": "Masked (sensitive field auto-detected)"
        }
    ]
}
```
