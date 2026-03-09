import assert from 'node:assert/strict';
import test from 'node:test';
import { RealtimeService } from '../src/platform/realtime/realtime.service.js';

test('RealtimeService enqueues realtime events for users', async () => {
  let payload: any = null;
  const jobsService = {
    async enqueue(input: any) {
      payload = input;
    }
  };
  const configService = {
    get() {
      return true;
    }
  };

  const deliveryService = {
    async recordEvent(_userId: string, event: Record<string, unknown>) {
      return { eventId: event.id ?? 'evt-1' };
    }
  };
  const service = new RealtimeService(jobsService as any, configService as any, deliveryService as any);
  await service.publishUserEvent('user-1', { type: 'ping' });

  assert.equal(payload.queue, 'realtime');
  assert.equal(payload.type, 'REALTIME_EVENT');
  assert.equal(payload.payload.channel, 'user:user-1');
});
