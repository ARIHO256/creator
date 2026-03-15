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
