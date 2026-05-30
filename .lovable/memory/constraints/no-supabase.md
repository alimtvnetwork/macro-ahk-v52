---
name: No Supabase
description: Never use Supabase auth, token, localStorage, or any Supabase-specific logic anywhere in the project
type: constraint
---
Supabase is completely forbidden in this project. Never add:
- Supabase localStorage scans (sb-*-auth-token keys)
- Supabase auth sessions or access_token extraction
- Any import or reference to Supabase SDKs or APIs
- Any mention of "Supabase" in code, comments, diagnostics, or suggestions

**Why:** The project has its own auth system (extension bridge + cookie + signed URL). Supabase was never part of v1.133 or any spec. It was a hallucinated dependency that must never be re-introduced.
