import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inviteMemberMany, updateMemberRoleMany, removeMemberMany } from '../ws-members-mutations';
import * as mutations from '../ws-members-mutations';

// Mock inviteMember, updateMemberRole, removeMember as they depend on SDK
vi.spyOn(mutations, 'inviteMember').mockImplementation(async () => {});
vi.spyOn(mutations, 'updateMemberRole').mockImplementation(async () => {});
vi.spyOn(mutations, 'removeMember').mockImplementation(async () => {});

describe('ws-members-mutations bulk', () => {
    const wsIds = ['ws-1', 'ws-2'];
    const workspaces = [
        { id: 'ws-1', name: 'WS 1', fullName: 'Workspace 1' },
        { id: 'ws-2', name: 'WS 2', fullName: 'Workspace 2' }
    ] as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should invite multiple emails to multiple workspaces', async () => {
        const result = await inviteMemberMany(wsIds, ['a@b.com', 'c@d.com'], 'member', workspaces);
        
        expect(result.success).toBe(4); // 2 ws * 2 emails
        expect(mutations.inviteMember).toHaveBeenCalledTimes(4);
    });

    it('should track failures in bulk invite', async () => {
        vi.spyOn(mutations, 'inviteMember').mockRejectedValueOnce(new Error('Rate limit'));
        
        const result = await inviteMemberMany(wsIds, ['a@b.com'], 'member', workspaces);
        
        expect(result.success).toBe(1);
        expect(result.fail).toBe(1);
        expect(result.failures[0].wsName).toBe('Workspace 1');
        expect(result.failures[0].reason).toBe('Rate limit');
    });

    it('should update role across workspaces', async () => {
        const result = await updateMemberRoleMany(wsIds, 'user-123', 'owner', workspaces);
        expect(result.success).toBe(2);
        expect(mutations.updateMemberRole).toHaveBeenCalledWith('ws-1', 'user-123', 'owner');
        expect(mutations.updateMemberRole).toHaveBeenCalledWith('ws-2', 'user-123', 'owner');
    });

    it('should remove member across workspaces', async () => {
        const result = await removeMemberMany(wsIds, 'user-123', workspaces);
        expect(result.success).toBe(2);
        expect(mutations.removeMember).toHaveBeenCalledTimes(2);
    });
});
