/**
 * Lightweight hook that fetches the error/warning count
 * for the sidebar badge. Listens for real-time ERROR_COUNT_CHANGED
 * broadcasts from the background service worker for instant updates,
 * with a polling fallback for environments without chrome.runtime.
 *
 * Polling rules (idle-loop audit, 2026-04-25):
 *   - When the broadcast listener is attached, the polling fallback is
 *     skipped entirely — broadcasts are authoritative and a redundant
 *     timer would just waste cycles + leak across re-renders.
 *   - When the page is hidden (`document.hidden === true`) the polling
 *     interval is suspended. Becoming visible triggers a single immediate
 *     refresh and re-arms the interval.
 */

import { useEffect, useState, useCallback } from "react";
import { sendMessage } from "@/lib/message-client";
import { logError } from "./hook-logger";

type ErrorCountBroadcast = { type?: string; count?: number } | null;
type BroadcastMessageHandler = (message: ErrorCountBroadcast) => void;
type RuntimeOnMessage = {
  addListener: (handler: BroadcastMessageHandler) => void;
  removeListener: (handler: BroadcastMessageHandler) => void;
};
type RuntimeLike = { onMessage?: RuntimeOnMessage };
type RefreshErrorCount = () => Promise<void>;
type CountSetter = (count: number) => void;

function getRuntime(): RuntimeLike | undefined {
  return typeof chrome !== "undefined" ? (chrome.runtime as RuntimeLike) : undefined;
}

function createBroadcastHandler(setCountValue: CountSetter): BroadcastMessageHandler {
  return (message) => {
    if (message?.type === "ERROR_COUNT_CHANGED") {
      setCountValue(message.count ?? 0);
    }
  };
}

function attachBroadcastListener(runtime: RuntimeLike | undefined, handler: BroadcastMessageHandler): boolean {
  if (!runtime?.onMessage) { return false; }
  try {
    runtime.onMessage.addListener(handler);
    return true;
  } catch (caught) {
    logError("useErrorCount.attachBroadcast", "chrome.runtime.onMessage.addListener threw — extension context likely invalidated, falling back to polling", caught);
    return false;
  }
}

function detachBroadcastListener(runtime: RuntimeLike | undefined, handler: BroadcastMessageHandler): void {
  try {
    runtime?.onMessage?.removeListener(handler);
  } catch (caught) {
    logError("useErrorCount.detachBroadcast", "chrome.runtime.onMessage.removeListener threw — context already invalidated", caught);
  }
}

function createPollingControls(refresh: RefreshErrorCount, pollIntervalMs: number, disabled: boolean) {
  let pollId: ReturnType<typeof setInterval> | null = null;
  const start = () => {
    if (disabled || pollId !== null) { return; }
    pollId = setInterval(() => void refresh(), pollIntervalMs);
  };
  const stop = () => {
    if (pollId === null) { return; }
    clearInterval(pollId);
    pollId = null;
  };
  return { start, stop };
}

function bindVisibilityPolling(
  pollingControls: ReturnType<typeof createPollingControls>,
  refresh: RefreshErrorCount,
  disabled: boolean,
): () => void {
  const handleVisibility = () => {
    if (disabled || typeof document === "undefined") { return; }
    if (document.hidden) { pollingControls.stop(); } else {
      void refresh();
      pollingControls.start();
    }
  };
  if (typeof document !== "undefined") { document.addEventListener("visibilitychange", handleVisibility); }
  if (typeof document === "undefined" || !document.hidden) { pollingControls.start(); }
  return () => {
    pollingControls.stop();
    if (typeof document !== "undefined") { document.removeEventListener("visibilitychange", handleVisibility); }
  };
}

function setupErrorCountSubscriptions(refresh: RefreshErrorCount, setCountValue: CountSetter, pollIntervalMs: number): () => void {
  const runtime = getRuntime();
  const broadcastHandler = createBroadcastHandler(setCountValue);
  const listenerAttached = attachBroadcastListener(runtime, broadcastHandler);
  const pollingControls = createPollingControls(refresh, pollIntervalMs, listenerAttached);
  const cleanupPolling = bindVisibilityPolling(pollingControls, refresh, listenerAttached);
  return () => {
    cleanupPolling();
    if (listenerAttached) { detachBroadcastListener(runtime, broadcastHandler); }
  };
}

export function useErrorCount(pollIntervalMs = 30_000) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const result = await sendMessage<{ errors: Array<{ id: string }> }>({ type: "GET_ACTIVE_ERRORS" });
      setCount(result.errors?.length ?? 0);
    } catch (caught) {
      logError("useErrorCount.refresh", "GET_ACTIVE_ERRORS failed — badge will show 0 until next poll", caught);
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return setupErrorCountSubscriptions(refresh, setCount, pollIntervalMs);
  }, [refresh, pollIntervalMs]);

  return { count, refresh };
}
