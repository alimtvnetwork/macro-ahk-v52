/**
 * Payment Banner Hider — On-page debug overlay.
 *
 * Renders a small fixed panel in the bottom-right that shows the last
 * locate() result: which pattern matched (or text-fallback), the matched
 * text, and how many collapse targets were walked. Toggled via
 * `window.PaymentBannerHider.debug()`.
 *
 * Pure DOM, zero external deps. Self-contained styles.
 */

import type { BannerDebugMatch } from "./types";

const OVERLAY_ID = "marco-banner-hider-debug";

function ensureOverlay(): HTMLElement {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing !== null) return existing;

    const el = document.createElement("div");
    el.id = OVERLAY_ID;
    el.setAttribute("data-marco-debug", "banner-hider");
    el.style.cssText = [
        "position:fixed",
        "bottom:12px",
        "right:12px",
        "z-index:2147483647",
        "background:#111",
        "color:#fff",
        "font:12px/1.4 ui-monospace,Menlo,monospace",
        "padding:10px 12px",
        "border:1px solid #444",
        "border-radius:6px",
        "max-width:340px",
        "box-shadow:0 4px 16px rgba(0,0,0,.5)",
        "pointer-events:auto",
    ].join(";");
    document.body.appendChild(el);
    return el;
}

export function renderDebugOverlay(match: BannerDebugMatch | null): void {
    if (typeof document === "undefined" || document.body === null) return;

    const el = ensureOverlay();
    if (match === null) {
        el.textContent = "BannerHider: no match yet";
        return;
    }

    const lines = [
        `BannerHider · ${match.source}`,
        match.xpath !== null ? `xpath: ${match.xpath}` : "xpath: —",
        `text: ${match.matchedText ?? "—"}`,
        `collapse targets: ${match.collapseTargetCount}`,
        `t: ${new Date(match.timestamp).toISOString()}`,
    ];
    el.textContent = lines.join("\n");
    el.style.whiteSpace = "pre";
}

export function hideDebugOverlay(): void {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing !== null) existing.remove();
}
