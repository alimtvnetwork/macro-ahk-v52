/**
 * Payment Banner Hider — Standalone Script
 *
 * Auto-injects on lovable.dev/* pages and hides the sticky billing
 * banner via the CSS3 transition declared in css/payment-banner-hider.css.
 */

import "./globals.d";
import { BannerLocator, type LocateResult } from "./banner-locator";
import { BannerLogFn } from "../../types/runtime/enums/banner";
import { logPaymentBannerHiderError } from "./logger";
import { renderDebugOverlay, hideDebugOverlay } from "./debug-overlay";
import {
    type BannerDebugMatch,
    BannerState,
    OBSERVER_DEBOUNCE_MS,
    REMOVE_DELAY_MS,
    STATE_ATTR,
    type PaymentBannerHiderApi,
} from "./types";

const VERSION = "3.69.0";

export class PaymentBannerHider implements PaymentBannerHiderApi {
    public readonly version = VERSION;

    private readonly locator: BannerLocator;
    private observer: MutationObserver | null = null;
    private debounceTimer: number | null = null;
    private lastMatch: BannerDebugMatch | null = null;
    private overlayActive = false;

    public constructor(locator: BannerLocator = new BannerLocator()) {
        this.locator = locator;
    }

    public start(): void {
        this.check();

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                this.check();
                this.startObserver();
            });
            return;
        }

        this.startObserver();
    }

    public check(): void {
        try {
            const hit = this.locator.locate();

            if (hit === null) {
                this.lastMatch = {
                    source: "none",
                    xpath: null,
                    matchedText: null,
                    collapseTargetCount: 0,
                    timestamp: Date.now(),
                };
                if (this.overlayActive) renderDebugOverlay(this.lastMatch);
                return;
            }

            if (hit.element.getAttribute(STATE_ATTR) !== null) return;

            this.hide(hit);
        } catch (caught) {
            this.logError(BannerLogFn.Check, "Detection pass failed", caught);
            throw caught;
        }
    }

    /** Toggle the on-page debug overlay; returns the last match snapshot. */
    public debug(): BannerDebugMatch | null {
        this.overlayActive = !this.overlayActive;
        if (this.overlayActive) {
            renderDebugOverlay(this.lastMatch);
        } else {
            hideDebugOverlay();
        }
        return this.lastMatch;
    }

    private hide(hit: LocateResult): void {
        const targets = this.collectCollapseTargets(hit.element);

        this.lastMatch = {
            source: hit.source,
            xpath: hit.xpath,
            matchedText: hit.matchedText,
            collapseTargetCount: targets.length,
            timestamp: Date.now(),
        };
        if (this.overlayActive) renderDebugOverlay(this.lastMatch);

        for (const t of targets) t.setAttribute(STATE_ATTR, BannerState.Fading);

        queueMicrotask(() => {
            for (const t of targets) t.setAttribute(STATE_ATTR, BannerState.Hiding);
        });

        window.setTimeout(() => {
            for (const t of targets) t.setAttribute(STATE_ATTR, BannerState.Done);
            this.stopObserver();
        }, REMOVE_DELAY_MS);
    }

    /**
     * Walk up single-child wrapper elements so parent `gap` / padding does
     * not leave a visible slot once the banner collapses. Stops at `main`,
     * `body`, or any ancestor with more than one element child.
     */
    private collectCollapseTargets(element: HTMLElement): HTMLElement[] {
        const out: HTMLElement[] = [element];
        let cur: HTMLElement = element;
        for (let i = 0; i < 3; i++) {
            const parentEl: HTMLElement | null = cur.parentElement;
            if (parentEl === null) break;
            if (parentEl.tagName === "MAIN" || parentEl.tagName === "BODY") break;
            if (parentEl.childElementCount !== 1) break;
            out.push(parentEl);
            cur = parentEl;
        }
        return out;
    }

    private startObserver(): void {
        if (this.observer !== null) return;
        if (typeof MutationObserver === "undefined") return;

        const root = document.body ?? document.documentElement;
        this.observer = new MutationObserver(() => this.scheduleCheck());
        this.observer.observe(root, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    }

    private stopObserver(): void {
        if (this.observer !== null) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.debounceTimer !== null) {
            window.clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }

    private scheduleCheck(): void {
        if (this.debounceTimer !== null) return;
        this.debounceTimer = window.setTimeout(() => {
            this.debounceTimer = null;
            this.check();
        }, OBSERVER_DEBOUNCE_MS);
    }

    private logError(fn: string, message: string, error: CaughtError): void {
        logPaymentBannerHiderError(fn, message, error);
    }
}

const instance = new PaymentBannerHider();
window.PaymentBannerHider = instance;
instance.start();
