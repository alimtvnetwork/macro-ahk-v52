#!/usr/bin/env bash
# probe-siblings.sh — generic HEAD-only probe.
#
# Spec: spec/2026/02 - CI-CD Spec For Chrome Extensions/README.md §20
# Two modes:
#   1. SIBLING DISCOVERY:  ./probe-siblings.sh siblings <base-url>
#        → prints the highest-numbered sibling that returns 200
#          (probes base-v2, base-v3, …, up to PROBE_MAX, default 20).
#   2. ASSET VERIFY:       ./probe-siblings.sh assets <url> [url ...]
#        → exits 0 only if every URL returns 200/302; otherwise prints each
#          missing url and the http code, then exits 4.
#
# Constraints (mem://constraints/no-retry-policy):
#   - Sequential fail-fast, NO retries, NO exponential backoff.
#   - Wall-clock cap PROBE_DEADLINE seconds (default 5) per request.
#   - Parallelism capped at PROBE_CONCURRENCY (default 8).
set -euo pipefail

PROBE_MAX="${PROBE_MAX:-20}"
PROBE_CONCURRENCY="${PROBE_CONCURRENCY:-8}"
PROBE_DEADLINE="${PROBE_DEADLINE:-5}"

mode="${1:-}"; shift || true
command -v curl >/dev/null || { echo "[probe] curl not found" >&2; exit 5; }

head_code() {
  curl -s -o /dev/null -w '%{http_code}' -m "$PROBE_DEADLINE" -I "$1" || echo "000"
}
export -f head_code
export PROBE_DEADLINE

case "$mode" in
  siblings)
    base="${1:-}"
    [[ -z "$base" ]] && { echo "usage: probe-siblings.sh siblings <base-url>" >&2; exit 3; }
    best=""
    # xargs -P for bounded parallelism; results unordered → sort numerically.
    found=$(
      seq 2 "$PROBE_MAX" \
        | xargs -P "$PROBE_CONCURRENCY" -I{} bash -c '
            url="'"$base"'-v{}"
            code=$(head_code "$url")
            [[ "$code" == "200" ]] && echo "{}"
          ' \
        | sort -n | tail -1
    )
    [[ -n "$found" ]] && best="${base}-v${found}"
    if [[ -n "$best" ]]; then
      echo "$best"
      exit 0
    fi
    echo "[probe] no sibling found for $base (probed v2..v${PROBE_MAX})" >&2
    exit 4
    ;;

  assets)
    (( $# > 0 )) || { echo "usage: probe-siblings.sh assets <url> [url ...]" >&2; exit 3; }
    missing=0
    for u in "$@"; do
      code=$(head_code "$u")
      case "$code" in
        200|302) echo "ok   $code $u" ;;
        *)       echo "MISS $code $u" >&2; missing=$((missing+1)) ;;
      esac
    done
    if (( missing > 0 )); then
      echo "[probe] AssetMissing count=$missing reason=release-asset-not-found" >&2
      exit 4
    fi
    exit 0
    ;;

  ""|-h|--help)
    sed -n '2,15p' "$0"
    exit 0
    ;;

  *)
    echo "[probe] unknown mode: $mode (expected: siblings | assets)" >&2
    exit 3
    ;;
esac
