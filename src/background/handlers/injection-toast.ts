/**
 * Marco Extension — Injection Toast UI
 *
 * MAIN-world toast notifications shown in the target tab after script
 * injection (loading spinner, success, failure). Extracted from
 * injection-handler.ts (PERF-R2) so each handler stays under the
 * cognitive-complexity budget.
 *
 * @see src/background/handlers/injection-handler.ts — pipeline orchestrator
 */

import { logCaughtError, BgLogTag } from "../bg-logger";
import { EXTENSION_VERSION } from "../../shared/constants";
import { handleGetSettings } from "./settings-handler";

const TOAST_EXIT_TRANSFORM = "translateY(8px) scale(0.96)";

/** Checks whether the injection toast setting is enabled. */
export async function isInjectionToastEnabled(): Promise<boolean> {
    try {
        const { settings } = await handleGetSettings();
        return settings.showInjectionToast !== false;
    } catch {
        return true; // default on
    }
}

/**
 * Shows a styled success toast in the target tab after scripts are injected.
 */
// eslint-disable-next-line max-lines-per-function
export async function showInjectionToastInTab(
    tabId: number,
    successCount: number,
    totalCount: number,
    durationMs: number,
): Promise<void> {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            // eslint-disable-next-line max-lines-per-function
            func: (ok: number, total: number, ms: number, version: string, exitTransform: string) => {
                const toastMessage = `✅ Marco v${version} — ${ok}/${total} scripts injected (${ms}ms)`;

                const loader = document.getElementById("__marco-inject-toast-loading");
                let loaderTimer: ReturnType<typeof setTimeout> | null = null;
                if (loader) {
                    loader.style.opacity = "0";
                    loader.style.transform = exitTransform;
                    loaderTimer = setTimeout(() => { loaderTimer = null; loader.remove(); }, 300);
                }

                const m = (window as unknown as Record<string, Record<string, ((...args: unknown[]) => void)>>).marco;
                if (m?.notify?.success) {
                    try { m.notify.success(toastMessage, { duration: 4000 }); return; } catch (sdkErr) { console.debug("[Marco] SDK toast.success failed, falling through to DOM toast:", sdkErr); }
                }

                const CONTAINER_ID = "__marco-inject-toast";
                let container = document.getElementById(CONTAINER_ID);
                if (!container) {
                    container = document.createElement("div");
                    container.id = CONTAINER_ID;
                    container.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:2147483647;pointer-events:none;display:flex;flex-direction:column;gap:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
                    (document.body || document.documentElement).appendChild(container);
                }

                const toast = document.createElement("div");
                toast.style.cssText = [
                    "pointer-events:auto",
                    "display:flex",
                    "align-items:center",
                    "gap:8px",
                    "padding:10px 16px",
                    "border-radius:10px",
                    "font-size:12px",
                    "font-weight:500",
                    "color:#d1fae5",
                    "background:linear-gradient(135deg,#065f46 0%,#064e3b 100%)",
                    "border:1px solid rgba(16,185,129,0.3)",
                    "box-shadow:0 8px 24px rgba(0,0,0,0.4),0 0 0 1px rgba(16,185,129,0.1)",
                    "opacity:0",
                    "transform:translateY(12px) scale(0.96)",
                    "transition:all 0.35s cubic-bezier(0.16,1,0.3,1)",
                    "max-width:380px",
                    "backdrop-filter:blur(12px)",
                ].join(";") + ";";

                const icon = document.createElement("span");
                icon.textContent = "✅";
                icon.style.cssText = "font-size:16px;flex-shrink:0;";

                const body = document.createElement("span");
                body.textContent = `Marco v${version} — ${ok}/${total} scripts injected (${ms}ms)`;

                const close = document.createElement("button");
                close.textContent = "✕";
                close.style.cssText = "background:none;border:none;color:#d1fae5;font-size:14px;cursor:pointer;opacity:0.6;padding:0 2px;margin-left:4px;transition:opacity 0.2s;";
                close.onmouseenter = () => { close.style.opacity = "1"; };
                close.onmouseleave = () => { close.style.opacity = "0.6"; };
                close.onclick = () => dismiss();

                let dismissTimer: ReturnType<typeof setTimeout> | null = null;
                let removeTimer: ReturnType<typeof setTimeout> | null = null;
                const cleanup = () => {
                    if (loaderTimer !== null) { clearTimeout(loaderTimer); loaderTimer = null; }
                    if (dismissTimer !== null) { clearTimeout(dismissTimer); dismissTimer = null; }
                    if (removeTimer !== null) { clearTimeout(removeTimer); removeTimer = null; }
                    window.removeEventListener("pagehide", cleanup);
                    close.onclick = null;
                    close.onmouseenter = null;
                    close.onmouseleave = null;
                    toast.remove();
                };

                const dismiss = () => {
                    if (dismissTimer !== null) { clearTimeout(dismissTimer); dismissTimer = null; }
                    toast.style.opacity = "0";
                    toast.style.transform = exitTransform;
                    removeTimer = setTimeout(cleanup, 350);
                };

                toast.appendChild(icon);
                toast.appendChild(body);
                toast.appendChild(close);
                container.appendChild(toast);

                requestAnimationFrame(() => {
                    toast.style.opacity = "1";
                    toast.style.transform = "translateY(0) scale(1)";
                });

                window.addEventListener("pagehide", cleanup, { once: true });
                dismissTimer = setTimeout(dismiss, 4000);
            },
            args: [successCount, totalCount, Math.round(durationMs), EXTENSION_VERSION, TOAST_EXIT_TRANSFORM],
        });
    } catch (toastError) {
        logCaughtError(BgLogTag.INJECTION, "showInjectionToastInTab failed", toastError);
    }
}

/**
 * Shows a red error toast in the target tab when one or more scripts fail injection.
 */
// eslint-disable-next-line max-lines-per-function
export async function showInjectionFailureToastInTab(
    tabId: number,
    failedNames: string[],
    failCount: number,
    totalCount: number,
    durationMs: number,
): Promise<void> {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            // eslint-disable-next-line max-lines-per-function
            func: (names: string[], failed: number, total: number, ms: number, version: string, exitTransform: string) => {
                const nameList = names.length <= 3 ? names.join(", ") : names.slice(0, 3).join(", ") + ` +${names.length - 3} more`;
                const toastMessage = `❌ Marco v${version} — ${failed}/${total} scripts failed (${ms}ms)\n${nameList}`;

                const loader = document.getElementById("__marco-inject-toast-loading");
                let loaderTimer: ReturnType<typeof setTimeout> | null = null;
                if (loader) {
                    loader.style.opacity = "0";
                    loader.style.transform = exitTransform;
                    loaderTimer = setTimeout(() => { loaderTimer = null; loader.remove(); }, 300);
                }

                const m = (window as unknown as Record<string, Record<string, ((...args: unknown[]) => void)>>).marco;
                if (m?.notify?.error) {
                    try { m.notify.error(toastMessage, { duration: 6000 }); return; } catch (sdkErr) { console.debug("[Marco] SDK toast.error failed, falling through to DOM toast:", sdkErr); }
                }

                const CONTAINER_ID = "__marco-inject-toast";
                let container = document.getElementById(CONTAINER_ID);
                if (!container) {
                    container = document.createElement("div");
                    container.id = CONTAINER_ID;
                    container.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:2147483647;pointer-events:none;display:flex;flex-direction:column;gap:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
                    (document.body || document.documentElement).appendChild(container);
                }

                const toast = document.createElement("div");
                toast.style.cssText = [
                    "pointer-events:auto",
                    "display:flex",
                    "align-items:flex-start",
                    "gap:8px",
                    "padding:10px 16px",
                    "border-radius:10px",
                    "font-size:12px",
                    "font-weight:500",
                    "color:#fecaca",
                    "background:linear-gradient(135deg,#7f1d1d 0%,#991b1b 100%)",
                    "border:1px solid rgba(239,68,68,0.3)",
                    "box-shadow:0 8px 24px rgba(0,0,0,0.4),0 0 0 1px rgba(239,68,68,0.1)",
                    "opacity:0",
                    "transform:translateY(12px) scale(0.96)",
                    "transition:all 0.35s cubic-bezier(0.16,1,0.3,1)",
                    "max-width:400px",
                    "backdrop-filter:blur(12px)",
                ].join(";") + ";";

                const icon = document.createElement("span");
                icon.textContent = "❌";
                icon.style.cssText = "font-size:16px;flex-shrink:0;margin-top:1px;";

                const body = document.createElement("div");
                body.style.cssText = "flex:1;min-width:0;";

                const titleDiv = document.createElement("div");
                titleDiv.textContent = `Marco v${version} — ${failed}/${total} scripts failed (${ms}ms)`;
                titleDiv.style.cssText = "margin-bottom:3px;";

                const detailDiv = document.createElement("div");
                detailDiv.textContent = nameList;
                detailDiv.style.cssText = "font-size:10px;opacity:0.75;word-break:break-word;";

                body.appendChild(titleDiv);
                body.appendChild(detailDiv);

                const close = document.createElement("button");
                close.textContent = "✕";
                close.style.cssText = "background:none;border:none;color:#fecaca;font-size:14px;cursor:pointer;opacity:0.6;padding:0 2px;margin-left:4px;transition:opacity 0.2s;flex-shrink:0;";
                close.onmouseenter = () => { close.style.opacity = "1"; };
                close.onmouseleave = () => { close.style.opacity = "0.6"; };
                close.onclick = () => dismiss();

                let dismissTimer: ReturnType<typeof setTimeout> | null = null;
                let removeTimer: ReturnType<typeof setTimeout> | null = null;
                // eslint-disable-next-line sonarjs/no-identical-functions
                const cleanup = () => {
                    if (loaderTimer !== null) { clearTimeout(loaderTimer); loaderTimer = null; }
                    if (dismissTimer !== null) { clearTimeout(dismissTimer); dismissTimer = null; }
                    if (removeTimer !== null) { clearTimeout(removeTimer); removeTimer = null; }
                    window.removeEventListener("pagehide", cleanup);
                    close.onclick = null;
                    close.onmouseenter = null;
                    close.onmouseleave = null;
                    toast.remove();
                };

                const dismiss = () => {
                    if (dismissTimer !== null) { clearTimeout(dismissTimer); dismissTimer = null; }
                    toast.style.opacity = "0";
                    toast.style.transform = exitTransform;
                    removeTimer = setTimeout(cleanup, 350);
                };

                toast.appendChild(icon);
                toast.appendChild(body);
                toast.appendChild(close);
                container.appendChild(toast);

                requestAnimationFrame(() => {
                    toast.style.opacity = "1";
                    toast.style.transform = "translateY(0) scale(1)";
                });

                window.addEventListener("pagehide", cleanup, { once: true });
                dismissTimer = setTimeout(dismiss, 6000);
            },
            args: [failedNames, failCount, totalCount, Math.round(durationMs), EXTENSION_VERSION, TOAST_EXIT_TRANSFORM],
        });
    } catch (toastError) {
        logCaughtError(BgLogTag.INJECTION, "showInjectionFailureToastInTab failed", toastError);
    }
}

/**
 * Shows a loading spinner toast while injection is in progress.
 */
// eslint-disable-next-line max-lines-per-function
export async function showInjectionLoadingToast(tabId: number, scriptCount: number): Promise<void> {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            // eslint-disable-next-line max-lines-per-function
            func: (count: number, version: string, exitTransform: string) => {
                const CONTAINER_ID = "__marco-inject-toast";
                let container = document.getElementById(CONTAINER_ID);
                if (!container) {
                    container = document.createElement("div");
                    container.id = CONTAINER_ID;
                    container.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:2147483647;pointer-events:none;display:flex;flex-direction:column;gap:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
                    (document.body || document.documentElement).appendChild(container);
                }

                const toast = document.createElement("div");
                toast.id = "__marco-inject-toast-loading";
                toast.style.cssText = [
                    "pointer-events:auto",
                    "display:flex",
                    "align-items:center",
                    "gap:8px",
                    "padding:10px 16px",
                    "border-radius:10px",
                    "font-size:12px",
                    "font-weight:500",
                    "color:#bfdbfe",
                    "background:linear-gradient(135deg,#1e3a5f 0%,#1e293b 100%)",
                    "border:1px solid rgba(59,130,246,0.3)",
                    "box-shadow:0 8px 24px rgba(0,0,0,0.4),0 0 0 1px rgba(59,130,246,0.1)",
                    "opacity:0",
                    "transform:translateY(12px) scale(0.96)",
                    "transition:all 0.35s cubic-bezier(0.16,1,0.3,1)",
                    "max-width:380px",
                    "backdrop-filter:blur(12px)",
                ].join(";") + ";";

                const spinner = document.createElement("span");
                spinner.style.cssText = "display:inline-block;width:14px;height:14px;border:2px solid rgba(147,197,253,0.3);border-top-color:#93c5fd;border-radius:50%;flex-shrink:0;";
                const spinId = "__marco-spin-" + Date.now();
                spinner.id = spinId;
                const style = document.createElement("style");
                style.textContent = `@keyframes __marco-spin{to{transform:rotate(360deg)}}#${spinId}{animation:__marco-spin 0.7s linear infinite}`;
                toast.appendChild(style);

                const body = document.createElement("span");
                body.textContent = `Marco v${version} — injecting ${count} script${count !== 1 ? "s" : ""}…`;

                toast.appendChild(spinner);
                toast.appendChild(body);
                container.appendChild(toast);

                requestAnimationFrame(() => {
                    toast.style.opacity = "1";
                    toast.style.transform = "translateY(0) scale(1)";
                });

                let dismissTimer: ReturnType<typeof setTimeout> | null = null;
                let removeTimer: ReturnType<typeof setTimeout> | null = null;
                const cleanup = () => {
                    if (dismissTimer !== null) { clearTimeout(dismissTimer); dismissTimer = null; }
                    if (removeTimer !== null) { clearTimeout(removeTimer); removeTimer = null; }
                    window.removeEventListener("pagehide", cleanup);
                    toast.remove();
                };

                window.addEventListener("pagehide", cleanup, { once: true });
                dismissTimer = setTimeout(() => {
                    dismissTimer = null;
                    if (toast.parentNode) {
                        toast.style.opacity = "0";
                        toast.style.transform = exitTransform;
                        removeTimer = setTimeout(cleanup, 350);
                    }
                }, 10000);
            },
            args: [scriptCount, EXTENSION_VERSION, TOAST_EXIT_TRANSFORM],
        });
    } catch (e) {
        logCaughtError(BgLogTag.INJECTION, "showInjectionLoadingToast failed", e);
    }
}
