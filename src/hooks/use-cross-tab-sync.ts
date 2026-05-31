import { useEffect, useRef } from "react";

/**
 * Syncs state across browser tabs using BroadcastChannel.
 * 
 * @param channelName The name of the channel to broadcast on.
 * @param state The local state to synchronize.
 * @param setState Callback to update the local state when a remote update arrives.
 */
export function useCrossTabSync<T>(
    channelName: string,
    state: T,
    setState: (next: T) => void,
) {
    const isRemoteUpdate = useRef(false);
    const channelRef = useRef<BroadcastChannel | null>(null);

    // Initialize channel once
    useEffect(() => {
        const channel = new BroadcastChannel(channelName);
        channelRef.current = channel;

        channel.onmessage = (event) => {
            isRemoteUpdate.current = true;
            setState(event.data as T);
        };

        return () => {
            channel.close();
            channelRef.current = null;
        };
    }, [channelName, setState]);

    // Send updates to other tabs whenever the local state changes,
    // but only if the change didn't originate from a remote update.
    useEffect(() => {
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }

        if (channelRef.current) {
            channelRef.current.postMessage(state);
        }
    }, [state]);
}
