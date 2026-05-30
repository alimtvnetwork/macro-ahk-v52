import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logging', () => ({ log: vi.fn() }));
vi.mock('../error-utils', () => ({ logError: vi.fn() }));
vi.mock('../shared-state', () => ({ CREDIT_API_BASE: 'https://api.test.com', VERSION: '3.41.0' }));
vi.mock('../ws-members-fetch', () => ({ 
  clearMembersCache: vi.fn(), 
  invalidateMembersCache: vi.fn() 
}));
vi.mock('../toast', () => ({ showToast: vi.fn() }));

import { inviteMemberMany, updateMemberRoleMany, removeMemberMany } from '../ws-members-mutations';
import { invalidateMembersCache } from '../ws-members-fetch';

interface MembershipsApi {
  invite: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  updateRole: ReturnType<typeof vi.fn>;
}

function installSdk(api: MembershipsApi): void {
  (window as any).marco = {
    api: { memberships: api },
  };
}

function uninstallSdk(): void {
  delete (window as any).marco;
}

describe('ws-members-mutations bulk', () => {
    const wsIds = ['ws-1', 'ws-2'];
    const workspaces = [
        { id: 'ws-1', name: 'WS 1', fullName: 'Workspace 1' },
        { id: 'ws-2', name: 'WS 2', fullName: 'Workspace 2' }
    ] as any;

    beforeEach(() => {
        vi.clearAllMocks();
        uninstallSdk();
    });

    it('should invite multiple emails to multiple workspaces', async () => {
        const api: MembershipsApi = {
            invite: vi.fn().mockResolvedValue({ ok: true, status: 200, data: {} }),
            remove: vi.fn(),
            updateRole: vi.fn(),
        };
        installSdk(api);

        const result = await inviteMemberMany(wsIds, ['a@b.com', 'c@d.com'], 'member', workspaces);
        
        expect(result.success).toBe(4);
        expect(api.invite).toHaveBeenCalledTimes(4);
        expect(invalidateMembersCache).toHaveBeenCalled();
    });

    it('should track failures in bulk invite', async () => {
        const api: MembershipsApi = {
            invite: vi.fn()
                .mockResolvedValueOnce({ ok: false, status: 429, data: 'Rate limited' })
                .mockResolvedValue({ ok: true, status: 200, data: {} }),
            remove: vi.fn(),
            updateRole: vi.fn(),
        };
        installSdk(api);
        
        const result = await inviteMemberMany(wsIds, ['a@b.com'], 'member', workspaces);
        
        expect(result.success).toBe(1);
        expect(result.fail).toBe(1);
        expect(result.failures[0].wsName).toBe('Workspace 1');
        expect(result.failures[0].reason).toContain('HTTP 429');
    });

    it('should update role across workspaces', async () => {
        const api: MembershipsApi = {
            invite: vi.fn(),
            remove: vi.fn(),
            updateRole: vi.fn().mockResolvedValue({ ok: true, status: 200, data: {} }),
        };
        installSdk(api);

        const result = await updateMemberRoleMany(wsIds, 'user-123', 'owner', workspaces);
        expect(result.success).toBe(2);
        expect(api.updateRole).toHaveBeenCalledTimes(2);
    });

    it('should remove member across workspaces', async () => {
        const api: MembershipsApi = {
            invite: vi.fn(),
            remove: vi.fn().mockResolvedValue({ ok: true, status: 200, data: {} }),
            updateRole: vi.fn(),
        };
        installSdk(api);

        const result = await removeMemberMany(wsIds, 'user-123', workspaces);
        expect(result.success).toBe(2);
        expect(api.remove).toHaveBeenCalledTimes(2);
    });
});
