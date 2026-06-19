/**
 * Regression tests — ID/attribute-based selector verification.
 *
 * Complements banner-collapse.test.ts (which exercises XPath patterns)
 * by asserting collapse behaviour against elements located via #id,
 * [role], [data-*], and class selectors — i.e. the same paths a human
 * debugger or DevTools query would take. These guard against regressions
 * where the locator works but collapse/observer/state-machine misbehaves.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BannerLocator, type LocateResult } from "./banner-locator";
import { PaymentBannerHider } from "./index";
import {
    BannerState,
    OBSERVER_DEBOUNCE_MS,
    REMOVE_DELAY_MS,
    STATE_ATTR,
} from "./types";

/** Stub locator that returns whatever element the test selected by ID/attr. */
class IdLocator extends BannerLocator {
    public constructor(private readonly element: HTMLElement | null) {
        super();
    }
    public override locate(): LocateResult | null {
        if (this.element === null) return null;
        return {
            element: this.element,
            source: "xpath",
            xpath: "stub",
            matchedText: "stub",
        };
    }
}

describe("PaymentBannerHider — selector-based regressions", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = "";
    });

    it("collapses a banner located by #id selector", async () => {
        document.body.innerHTML = `<div id="pay-banner">Payment issue detected.</div>`;
        const element = document.querySelector<HTMLElement>("#pay-banner")!;

        new PaymentBannerHider(new IdLocator(element)).check();

        expect(element.getAttribute(STATE_ATTR)).toBe(BannerState.Fading);
        await vi.advanceTimersByTimeAsync(REMOVE_DELAY_MS + 10);
        expect(element.getAttribute(STATE_ATTR)).toBe(BannerState.Done);
    });

    it("collapses a banner located by [role='alert']", async () => {
        document.body.innerHTML = `<div role="alert" id="r">Update payment method</div>`;
        const element = document.querySelector<HTMLElement>("[role='alert']")!;

        new PaymentBannerHider(new IdLocator(element)).check();
        expect(element.getAttribute(STATE_ATTR)).toBe(BannerState.Fading);
    });

    it("collapses a banner located by [data-testid]", async () => {
        document.body.innerHTML = `<div data-testid="billing-banner">Final notice</div>`;
        const element = document.querySelector<HTMLElement>("[data-testid='billing-banner']")!;

        new PaymentBannerHider(new IdLocator(element)).check();
        expect(element.getAttribute(STATE_ATTR)).toBe(BannerState.Fading);
        await vi.advanceTimersByTimeAsync(REMOVE_DELAY_MS + 10);
        expect(element.getAttribute(STATE_ATTR)).toBe(BannerState.Done);
    });

    it("collapses a banner located by class selector", async () => {
        document.body.innerHTML = `<div class="billing-warning">reverted to the Free plan</div>`;
        const element = document.querySelector<HTMLElement>(".billing-warning")!;

        new PaymentBannerHider(new IdLocator(element)).check();
        expect(element.getAttribute(STATE_ATTR)).toBe(BannerState.Fading);
    });

    it("walks single-child wrappers up to 3 levels (id-located)", async () => {
        document.body.innerHTML = `
            <div id="L3"><div id="L2"><div id="L1"><div id="banner">Payment issue detected.</div></div></div></div>
            <div id="sibling">other</div>
        `;
        const banner = document.querySelector<HTMLElement>("#banner")!;
        const L1 = document.querySelector<HTMLElement>("#L1")!;
        const L2 = document.querySelector<HTMLElement>("#L2")!;
        const L3 = document.querySelector<HTMLElement>("#L3")!;

        new PaymentBannerHider(new IdLocator(banner)).check();

        for (const element of [banner, L1, L2, L3]) {
            expect(element.getAttribute(STATE_ATTR)).toBe(BannerState.Fading);
        }
    });

    it("stops walking at the first multi-child ancestor", () => {
        document.body.innerHTML = `
            <div id="parent">
                <div id="banner">Payment issue detected.</div>
                <div id="other">untouched</div>
            </div>
        `;
        const banner = document.querySelector<HTMLElement>("#banner")!;
        const parent = document.querySelector<HTMLElement>("#parent")!;
        const other = document.querySelector<HTMLElement>("#other")!;

        new PaymentBannerHider(new IdLocator(banner)).check();

        expect(banner.getAttribute(STATE_ATTR)).toBe(BannerState.Fading);
        expect(parent.getAttribute(STATE_ATTR)).toBeNull();
        expect(other.getAttribute(STATE_ATTR)).toBeNull();
    });

    it("never collapses <main> or <body> even as single-child ancestors", () => {
        document.body.innerHTML = `<main><div id="banner">Final notice</div></main>`;
        const banner = document.querySelector<HTMLElement>("#banner")!;

        new PaymentBannerHider(new IdLocator(banner)).check();

        expect(banner.getAttribute(STATE_ATTR)).toBe(BannerState.Fading);
        expect(document.querySelector("main")!.getAttribute(STATE_ATTR)).toBeNull();
        expect(document.body.getAttribute(STATE_ATTR)).toBeNull();
    });

    it("transitions fading → hiding via microtask, then done after REMOVE_DELAY_MS", async () => {
        document.body.innerHTML = `<div id="b">Payment issue detected.</div>`;
        const element = document.querySelector<HTMLElement>("#b")!;

        new PaymentBannerHider(new IdLocator(element)).check();
        expect(element.getAttribute(STATE_ATTR)).toBe(BannerState.Fading);

        await Promise.resolve();
        expect(element.getAttribute(STATE_ATTR)).toBe(BannerState.Hiding);

        await vi.advanceTimersByTimeAsync(REMOVE_DELAY_MS + 5);
        expect(element.getAttribute(STATE_ATTR)).toBe(BannerState.Done);
    });

    it("is idempotent: a second check() on the same element does nothing", async () => {
        document.body.innerHTML = `<div id="b">Payment issue detected.</div>`;
        const element = document.querySelector<HTMLElement>("#b")!;
        const hider = new PaymentBannerHider(new IdLocator(element));

        hider.check();
        await Promise.resolve();
        const stateAfterFirst = element.getAttribute(STATE_ATTR);

        hider.check();
        expect(element.getAttribute(STATE_ATTR)).toBe(stateAfterFirst);
    });

    it("does nothing when locator returns null (no banner present)", () => {
        document.body.innerHTML = `<div id="safe">page content</div>`;
        new PaymentBannerHider(new IdLocator(null)).check();
        expect(document.querySelector("#safe")!.getAttribute(STATE_ATTR)).toBeNull();
    });

    it("exposes window.PaymentBannerHider with check() and debug()", () => {
        expect(typeof window.PaymentBannerHider).toBe("object");
        expect(typeof window.PaymentBannerHider?.check).toBe("function");
        expect(typeof window.PaymentBannerHider?.debug).toBe("function");
        expect(typeof window.PaymentBannerHider?.version).toBe("string");
    });

    it("debug() toggles the overlay and reports the last match", async () => {
        document.body.innerHTML = `<div id="b">Payment issue detected.</div>`;
        const element = document.querySelector<HTMLElement>("#b")!;
        const hider = new PaymentBannerHider(new IdLocator(element));
        hider.check();
        await vi.advanceTimersByTimeAsync(REMOVE_DELAY_MS + 10);

        const match = hider.debug();
        expect(match).not.toBeNull();
        expect(match?.source).toBe("xpath");
        expect(match?.collapseTargetCount).toBeGreaterThanOrEqual(1);
        expect(document.getElementById("marco-banner-hider-debug")).not.toBeNull();

        hider.debug(); // toggle off
        expect(document.getElementById("marco-banner-hider-debug")).toBeNull();
    });

    it("debounces MutationObserver-driven re-checks", async () => {
        document.body.innerHTML = `<div id="root"></div>`;
        const hider = new PaymentBannerHider(new IdLocator(null));
        const spy = vi.spyOn(hider, "check");
        hider.start();

        const root = document.querySelector<HTMLElement>("#root")!;
        for (let i = 0; i < 5; i++) root.appendChild(document.createElement("span"));

        await vi.advanceTimersByTimeAsync(OBSERVER_DEBOUNCE_MS + 5);
        // 1 initial check from start() + 1 coalesced check from the burst.
        expect(spy).toHaveBeenCalledTimes(2);
    });
});
