/**
 * Regression test — banner height collapse for both parent and inner
 * wrapper layouts, plus text-fallback when XPath misses.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { BannerLocator } from "./banner-locator";
import { PaymentBannerHider } from "./index";
import { BannerState, REMOVE_DELAY_MS, STATE_ATTR } from "./types";

function buildPattern1(): { banner: HTMLElement; wrapper: HTMLElement } {
    // /html/body/div[2]/main/div/div[1] — banner has its own wrapper.
    document.body.innerHTML = `
        <div id="d1"></div>
        <div id="d2">
            <main>
                <div id="wrap">
                    <div id="banner">Payment issue detected. Please update.</div>
                    <div id="content">page</div>
                </div>
            </main>
        </div>
    `;
    return {
        banner: document.getElementById("banner")!,
        wrapper: document.getElementById("wrap")!,
    };
}

function buildPattern2(): HTMLElement {
    // /html/body/div[2]/main/div/div[1]/div — inner div pattern.
    document.body.innerHTML = `
        <div id="d1"></div>
        <div id="d2">
            <main>
                <div>
                    <div id="outer">
                        <div id="inner">Update payment method now — Final notice</div>
                    </div>
                    <div id="content">page</div>
                </div>
            </main>
        </div>
    `;
    return document.getElementById("inner")!;
}

describe("PaymentBannerHider collapse", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = "";
    });

    it("collapses pattern 1 (parent div) and walks single-child wrappers", async () => {
        const { banner } = buildPattern1();
        const hider = new PaymentBannerHider(new BannerLocator());
        hider.check();

        expect(banner.getAttribute(STATE_ATTR)).toBe(BannerState.Fading);

        await vi.advanceTimersByTimeAsync(REMOVE_DELAY_MS + 10);
        expect(banner.getAttribute(STATE_ATTR)).toBe(BannerState.Done);
    });

    it("collapses pattern 2 (inner div) including its single-child wrapper", async () => {
        const inner = buildPattern2();
        const outer = inner.parentElement!;
        const hider = new PaymentBannerHider(new BannerLocator());
        hider.check();

        expect(inner.getAttribute(STATE_ATTR)).toBe(BannerState.Fading);
        // outer is a single-child wrapper around inner → must collapse too.
        expect(outer.getAttribute(STATE_ATTR)).toBe(BannerState.Fading);

        await vi.advanceTimersByTimeAsync(REMOVE_DELAY_MS + 10);
        expect(inner.getAttribute(STATE_ATTR)).toBe(BannerState.Done);
        expect(outer.getAttribute(STATE_ATTR)).toBe(BannerState.Done);
    });

    it("falls back to text-scan when XPath structure does not match", async () => {
        document.body.innerHTML = `
            <header>nav</header>
            <section>
                <article>
                    <div id="alt-banner">Update payment method to keep building</div>
                </article>
            </section>
        `;
        const target = document.getElementById("alt-banner")!;
        const hider = new PaymentBannerHider(new BannerLocator());
        hider.check();

        expect(target.getAttribute(STATE_ATTR)).toBe(BannerState.Fading);
        await vi.advanceTimersByTimeAsync(REMOVE_DELAY_MS + 10);
        expect(target.getAttribute(STATE_ATTR)).toBe(BannerState.Done);
    });

    it("does not collapse <body> or <main> via text fallback", () => {
        document.body.innerHTML = `
            <main><div><p>no banner text here</p></div></main>
        `;
        const hider = new PaymentBannerHider(new BannerLocator());
        hider.check();
        expect(document.body.getAttribute(STATE_ATTR)).toBeNull();
        expect(document.querySelector("main")!.getAttribute(STATE_ATTR)).toBeNull();
    });
});
