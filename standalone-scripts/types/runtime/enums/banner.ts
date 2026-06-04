/**
 * Banner runtime enums (Priority 0.14).
 *
 * Shared closed sets used by `payment-banner-hider` and any future
 * banner-style standalone script. Replaces magic strings at runtime
 * (`fn` names passed to Logger, lifecycle phases, dispatched event kinds).
 *
 * Authored as `const enum`s per Q1 decision (2026-06-03 08:05 KL) so
 * downstream callsites compile to inlined string literals — no runtime
 * object cost — while still being enum-typed.
 */

/** Lifecycle phase reported by a banner-hider class to logs and metrics. */
export const enum BannerLifecyclePhase {
    Boot = "boot",
    DomReady = "dom-ready",
    Detected = "detected",
    Fading = "fading",
    Hiding = "hiding",
    Done = "done",
    ObserverArmed = "observer-armed",
    ObserverDisarmed = "observer-disarmed",
}

/**
 * `kind` discriminator for `RiseupAsiaMessage<TPayload>` envelopes
 * dispatched by banner-style scripts (Priority 0.16 consumer).
 */
export const enum BannerEventName {
    Check = "banner:check",
    Hidden = "banner:hidden",
    Error = "banner:error",
}

/**
 * Logger `fn` labels — every Logger.error/info call inside a banner
 * script must use one of these constants (no inline strings).
 */
export const enum BannerLogFn {
    Check = "PaymentBannerHider.check",
    Hide = "PaymentBannerHider.hide",
    SmokeTest = "PaymentBannerHider.smokeTest",
    StartObserver = "PaymentBannerHider.startObserver",
    StopObserver = "PaymentBannerHider.stopObserver",
}
