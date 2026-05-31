import { describe, it, expect } from 'vitest';
import { aggregateMembers } from '../ws-members-aggregate';

describe('ws-members-aggregate', () => {
  it('should identify common members', () => {
    const data = [
      {
        wsId: 'ws-1',
        wsName: 'Workspace 1',
        members: [{ user_id: 'u1', email: 'u1@ex.com', display_name: 'User 1' }]
      },
      {
        wsId: 'ws-2',
        wsName: 'Workspace 2',
        members: [{ user_id: 'u1', email: 'u1@ex.com', display_name: 'User 1' }]
      }
    ];

    const { union } = aggregateMembers(data);
    expect(union[0].presenceCount).toBe(2);
    expect(union[0].workspaces).toContain('Workspace 1');
    expect(union[0].workspaces).toContain('Workspace 2');
  });

  it('should identify partial members', () => {
    const data = [
      {
        wsId: 'ws-1',
        wsName: 'Workspace 1',
        members: [{ user_id: 'u1', email: 'u1@ex.com', display_name: 'User 1' }]
      },
      {
        wsId: 'ws-2',
        wsName: 'Workspace 2',
        members: [{ user_id: 'u2', email: 'u2@ex.com', display_name: 'User 2' }]
      }
    ];

    const { union } = aggregateMembers(data);
    expect(union.length).toBe(2);
    expect(union.find(u => u.userId === 'u1')?.presenceCount).toBe(1);
    expect(union.find(u => u.userId === 'u2')?.presenceCount).toBe(1);
  });
});
