/**
 * Riseup Macro SDK — Config Module
 *
 * Provides marco.config.* methods for project configuration.
 * Supports reactivity: set() persists and broadcasts CONFIG_CHANGED.
 *
 * See: spec/21-app/02-features/devtools-and-injection/sdk-convention.md §marco.config
 */

import { sendMessage } from "./bridge";
import { NamespaceLogger } from "./logger";

type ConfigChangeCallback = (key: string, value: unknown) => void;

export interface ConfigApi {
    get(key: string): Promise<unknown>;
    getAll(): Promise<Record<string, unknown>>;
    set(key: string, value: unknown): Promise<void>;
    onChange(callback: ConfigChangeCallback): void;
}

const changeListeners: ConfigChangeCallback[] = [];

export function createConfigApi(): ConfigApi {
    return {
        get(key: string) {
            return sendMessage<unknown>("CONFIG_GET", { key });
        },
        getAll() {
            return sendMessage<Record<string, unknown>>("CONFIG_GET_ALL");
        },
        async set(key: string, value: unknown) {
            await sendMessage<void>("CONFIG_SET", { key, value });
        },
        onChange(callback: ConfigChangeCallback) {
            changeListeners.push(callback);
        },
    };
}

/**
 * Called internally when a CONFIG_CHANGED event is received from the relay.
 */
export function notifyConfigChange(key: string, value: unknown): void {
    for (const listener of changeListeners) {
        try {
            listener(key, value);
        } catch (caught) {
            NamespaceLogger.error("notifyConfigChange", `Config-change listener threw for key="${key}" — listener will continue receiving events but this callback's failure was non-fatal`, caught);
        }
    }
}
