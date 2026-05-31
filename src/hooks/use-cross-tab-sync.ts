import { useEffect, useState } from "react";

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
    useEffect(() => {
        const channel = new BroadcastChannel(channelName);

        // Notify other tabs of the current state on mount
        channel.postMessage(state);

        // Update local state when other tabs broadcast an update
        channel.onmessage = (event) => {
            setState(event.data as T);
        };

        return () => {
            channel.close();
        };
    }, [channelName, state, setState]);

    // Send updates to other tabs whenever the local state changes
    useEffect(() => {
        const channel = new BroadcastChannel(channelName);
        channel.postMessage(state);
        return () => {
            channel.close();
        };
    }, [channelName, state]);
}
