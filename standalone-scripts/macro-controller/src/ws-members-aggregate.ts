import type { PerWsMembers } from './ws-members-fetch';

export interface AggregatedMember {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  presenceCount: number; // How many workspaces they are in
  workspaces: string[]; // List of wsNames
}

/**
 * Aggregates members from multiple workspaces.
 * Identifies common members (present in ALL selected) vs partial.
 */
export function aggregateMembers(perWs: PerWsMembers[]): {
  union: AggregatedMember[];
  totalWs: number;
} {
  const unionMap = new Map<string, AggregatedMember>();
  const totalWs = perWs.length;

  for (const wsResult of perWs) {
    if (wsResult.error) continue;
    
    for (const m of wsResult.members) {
      const userId = (m as any).user_id || (m as any).id || (m as any).email; // Fallback to email if no ID
      if (!userId) continue;

      let agg = unionMap.get(userId);
      if (!agg) {
        agg = {
          userId,
          email: m.email,
          fullName: (m as any).display_name || (m as any).name || (m as any).email,
          role: m.role || 'member',
          presenceCount: 0,
          workspaces: []
        };
        unionMap.set(userId, agg);
      }
      agg.presenceCount++;
      agg.workspaces.push(wsResult.wsName);
    }
  }

  const union = Array.from(unionMap.values()).sort((a, b) => {
    // Sort by presence count DESC, then alpha
    if (b.presenceCount !== a.presenceCount) {
      return b.presenceCount - a.presenceCount;
    }
    return a.fullName.localeCompare(b.fullName);
  });

  return { union, totalWs };
}
