# 04 — Probing Feature

> Cross-repo sibling probing rules and a runnable example.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §4. Probing feature

*Probing* = parallel HEAD requests to discover sibling repos or assets without
downloading them.

- Use cases: detect highest-version sibling repo (`project-v2`, `project-v3`);
  verify all expected assets exist on a release page before publishing.
- Defaults: depth ≤ 20, parallelism ≤ 8, wall-clock cap 5 s.
- Implementation: `curl -I -o /dev/null -w "%{http_code}"` (bash) or
  `Invoke-WebRequest -Method Head` (PowerShell).
- **Never** retry on failure — sequential fail-fast.


---

## §20. Probing feature (full example)

```bash

# probe-siblings.sh — find the highest-numbered sibling repo (project-v2, -v3 …)
probe_max=20; concurrency=8; deadline=5
base="$1"  # e.g. https://github.com/acme/project
seq 2 "$probe_max" | xargs -P "$concurrency" -I{} -t bash -c '
  url="'"$base"'-v{}"
  code=$(curl -s -o /dev/null -w "%{http_code}" -m '"$deadline"' "$url")
  [[ "$code" == "200" ]] && echo "{}"
' | sort -n | tail -1
```

The same algorithm is used during release publication to verify every required
asset URL returns `200` before flipping `draft: false`.

