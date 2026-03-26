import assert from 'node:assert/strict';
import test from 'node:test';
import { LiveService } from '../src/modules/live/live.service.js';

test('LiveService.toolGet seeds default tool payload for new configs', async () => {
  const prisma = {
    liveToolConfig: {
      async findUnique() {
        return null;
      },
      async create({ data }: any) {
        return { id: 'cfg-1', ...data };
      }
    }
  };

  const service = new LiveService(prisma as any);
  const payload = await service.toolGet('user-1', 'overlays');

  assert.equal(payload.tab, 'qr');
  assert.equal(payload.qrEnabled, true);
  assert.equal(payload.variant, 'A');
});

test('LiveService.toolGet backfills defaults for legacy empty configs', async () => {
  const prisma = {
    liveToolConfig: {
      async findUnique() {
        return { id: 'cfg-1', data: {} };
      },
      async update({ data }: any) {
        return { id: 'cfg-1', data: data.data };
      }
    }
  };

  const service = new LiveService(prisma as any);
  const payload = await service.toolGet('user-1', 'audience-notifications');

  assert.equal(payload.creatorInvolvement, 'use_creator');
  assert.equal(payload.selectedPackId, 'pack_default_v3');
});

test('LiveService.updateStudio accepts a live studio record id by resolving its session id', async () => {
  const now = new Date('2026-03-25T11:00:00.000Z');
  let updatedPayload: Record<string, unknown> | null = null;
  const prisma = {
    liveStudio: {
      async findFirst({ where }: any) {
        const identifiers = where.OR.map((entry: any) => entry.id ?? entry.sessionId);
        if (identifiers.includes('studio-1')) {
          return { sessionId: 'session-1' };
        }
        return null;
      },
      async upsert({ where }: any) {
        assert.equal(where.sessionId, 'session-1');
        return {
          id: 'studio-1',
          userId: 'user-1',
          sessionId: 'session-1',
          status: 'idle',
          startedAt: null,
          endedAt: null,
          data: { mode: 'builder', sessionId: 'session-1' },
          createdAt: now,
          updatedAt: now
        };
      },
      async update({ where, data }: any) {
        assert.equal(where.id, 'studio-1');
        updatedPayload = data.data;
        return {
          id: 'studio-1',
          userId: 'user-1',
          sessionId: 'session-1',
          status: 'idle',
          startedAt: null,
          endedAt: null,
          data: updatedPayload,
          createdAt: now,
          updatedAt: now
        };
      }
    },
    liveSession: {
      async findFirst({ where }: any) {
        assert.equal(where.id, 'session-1');
        assert.equal(where.userId, 'user-1');
        return {
          id: 'session-1',
          userId: 'user-1',
          status: 'draft',
          title: null,
          scheduledAt: null,
          startedAt: null,
          endedAt: null,
          data: { sessionId: 'session-1' },
          createdAt: now,
          updatedAt: now
        };
      },
      async create() {
        throw new Error('should not create a new live session');
      }
    }
  };

  const service = new LiveService(prisma as any);
  const studio = await service.updateStudio('user-1', 'studio-1', {
    data: { mode: 'lobby', micOn: true }
  } as any);

  assert.equal(studio.id, 'studio-1');
  assert.equal(studio.sessionId, 'session-1');
  assert.equal((updatedPayload as any)?.sessionId, 'session-1');
  assert.equal((updatedPayload as any)?.mode, 'lobby');
  assert.equal((updatedPayload as any)?.micOn, true);
});
