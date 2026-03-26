import assert from 'node:assert/strict';
import test from 'node:test';
import { LiveService } from '../src/modules/live/live.service.js';

test('LiveService.replays returns empty list on recoverable connection errors', async () => {
  const prisma = {
    liveReplay: {
      async findMany() {
        throw new Error('Server has closed the connection.');
      }
    }
  };

  const service = new LiveService(prisma as any);
  const replays = await service.replays('user-1');

  assert.deepEqual(replays, []);
});

test('LiveService.replays returns empty list when replay storage table is missing', async () => {
  const prisma = {
    liveReplay: {
      async findMany() {
        throw { code: 'P2021' };
      }
    }
  };

  const service = new LiveService(prisma as any);
  const replays = await service.replays('user-1');

  assert.deepEqual(replays, []);
});
