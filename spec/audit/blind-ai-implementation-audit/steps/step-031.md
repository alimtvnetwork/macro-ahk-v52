# Step 31 — Unified `getBearerToken()` contract

**Time:** ~2 min · **Severity:** Low

- **Sources:** Core memory "Auth Contract", `mem://auth/unified-auth-contract`; grep `getBearerToken` across repo.
- **Blind-AI likely output:** LLM would invent ad-hoc token getters (`getToken`, `fetchAuth`). Memory mandates single path.
- **Actual:** `getBearerToken` used in 5 modules: `marco-sdk/src/http.ts`, `macro-controller/src/auth.ts`, `auth-resolve.ts`, `auth-recovery.ts`, `auth-bridge.ts` — clean usage. No legacy `fetchToken` matches in `src/`.
- **Gap:** No ESLint guard preventing reintroduction of legacy names.
- **Recommendation:** Add `no-restricted-syntax` rules banning identifiers matching `/^(fetchToken|getAuthToken|loadBearer)$/`.
