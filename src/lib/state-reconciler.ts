import { PromptEntry } from "@/hooks/use-prompts";
import { StepGroupRow, StepRow } from "@/background/recorder/step-library/db";

/**
 * Handles merging of state updates from different tabs.
 * In a more complex implementation, this could use CRDTs or last-writer-wins with timestamps.
 */
export class StateReconciler {
    /**
     * Merges prompt lists.
     */
    static reconcilePrompts(local: PromptEntry[], remote: PromptEntry[]): PromptEntry[] {
        // Simple strategy: items in remote that aren't in local, 
        // or items in remote that have a newer updatedAt.
        const merged = [...local];
        
        remote.forEach(remoteItem => {
            const index = merged.findIndex(i => i.id === remoteItem.id);
            if (index === -1) {
                merged.push(remoteItem);
            } else if (new Date(remoteItem.updatedAt) > new Date(merged[index].updatedAt)) {
                merged[index] = remoteItem;
            }
        });

        return merged.sort((a, b) => a.order - b.order);
    }

    /**
     * Reconciles step library state. 
     * Since the step library is backed by a SQL database exported as bytes,
     * simple byte merging isn't possible. This would require a logical merge.
     * For now, we use a simple 'latest version' strategy if we had timestamps.
     */
    static reconcileStepLibrary(localBytes: Uint8Array, remoteBytes: Uint8Array): Uint8Array {
        // Placeholder: in a real app, you'd compare sequence numbers or timestamps.
        // For this demo, we'll return the remote if it's different.
        return remoteBytes;
    }
}
