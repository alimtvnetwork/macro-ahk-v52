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

    useEffect(() => {
        const channel = new BroadcastChannel(channelName);

        channel.onmessage = (event) => {
            isRemoteUpdate.current = true;
            setState(event.data as T);
        };

        return () => {
            channel.close();
        };
    }, [channelName, setState]);

    // Send updates to other tabs whenever the local state changes,
    // but only if the change didn't originate from a remote update.
    useEffect(() => {
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }

        const channel = new BroadcastChannel(channelName);
        channel.postMessage(state);
        
        return () => {
            channel.close();
        };
    }, [channelName, state]);
}



