# Step 38 — Auth bridge service TTL handling

**Time:** ~2 min · **Severity:** Med

- **Sources:** `mem://architecture/auth-bridge-service`, `auth-bridge.ts`.
- **Blind-AI likely output:** LLM would re-fetch every call. Memory mandates TTL-aware caching via localStorage.
- **Actual:** `auth-bridge.ts` exists with diagram. TTL constant location unverified in this slice.
- **Gap:** TTL value likely inline; not centralized; no expiry-boundary test sampled.
- **Recommendation:** Extract `AUTH_BRIDGE_TTL_MS` to constants; add `auth-bridge.ttl.test.ts` covering: just-before-TTL = cache hit, just-after-TTL = refetch.
