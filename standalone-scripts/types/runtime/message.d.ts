/**
 * Typed message envelope (Priority 0.16).
 *
 * Replaces every `as unknown as Message` cast in standalone scripts with
 * a discriminated `RiseupAsiaMessage<TPayload>` envelope keyed on a closed
 * `kind` enum (e.g. `BannerEventName`). The SDK exposes `Messaging.dispatch`
 * and `Messaging.on` overloads bound to this envelope so the discriminant
 * narrows `payload` automatically.
 */

export {};

declare global {
    /**
     * Generic envelope. `TKind` is the discriminant (typically a
     * `const enum` member); `TPayload` is the per-kind payload shape.
     */
    interface RiseupAsiaMessage<TKind extends string, TPayload> {
        readonly kind: TKind;
        readonly version: 1;
        readonly source: "standalone-script";
        readonly payload: TPayload;
    }

    interface RiseupAsiaMessaging {
        dispatch<TKind extends string, TPayload>(
            message: RiseupAsiaMessage<TKind, TPayload>,
        ): void;

        on<TKind extends string, TPayload>(
            kind: TKind,
            handler: (message: RiseupAsiaMessage<TKind, TPayload>) => void,
        ): () => void;
    }

    interface RiseupAsiaMacroExtNamespace {
        Messaging?: RiseupAsiaMessaging;
    }
}
