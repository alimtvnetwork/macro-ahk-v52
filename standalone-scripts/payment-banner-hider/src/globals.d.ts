/**
 * Global type augmentations for Payment Banner Hider.
 *
 * Declared here so the entry point can assign to `window.PaymentBannerHider`
 * without `as unknown as ...` casts (per the no-type-casting standard).
 *
 */

import type { PaymentBannerHiderApi } from "./types";

declare global {
    interface Window {
        PaymentBannerHider?: PaymentBannerHiderApi;
    }
}

export {};
