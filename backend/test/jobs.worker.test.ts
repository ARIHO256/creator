import assert from 'node:assert/strict';
import test from 'node:test';
import { JobsWorker } from '../src/modules/jobs/jobs.worker.js';

function createConfigService(overrides: Record<string, unknown> = {}) {
  return {
    get(key: string) {
      return overrides[key];
    }
  };
}

test('JobsWorker processes batches up to configured concurrency', async () => {
  const queue = [
    { id: 'job-1', type: 'TEST', payload: {} },
    { id: 'job-2', type: 'TEST', payload: {} },
    { id: 'job-3', type: 'TEST', payload: {} }
  ];
  let inFlight = 0;
  let maxInFlight = 0;

  const jobsService = {
    async fetchAndLockNext() {
      return queue.shift() ?? null;
    },
    async markCompleted() {
      return undefined;
    },
    async markFailed() {
      return undefined;
    }
  };

  const worker = new JobsWorker(
    jobsService as any,
    createConfigService({
      'jobs.workerBatch': 3,
      'jobs.workerConcurrency': 2,
      'jobs.lockTtlMs': 1000,
      'jobs.workerId': 'api'
    }) as any,
    {} as any
  );

  (worker as any).running = true;
  (worker as any).schedule = () => undefined;
  (worker as any).process = async () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 10));
    inFlight -= 1;
  };

  await (worker as any).tick();

  assert.equal(maxInFlight, 2);
});

test('JobsWorker publishes realtime events with shared stream metadata', async () => {
  let published: any = null;
  let emitted: any = null;

  const worker = new JobsWorker(
    {} as any,
    createConfigService({ 'realtime.deliveryMaxAttempts': 5 }) as any,
    { deliveryReceipt: { findUnique: async () => null } } as any,
    undefined,
    undefined,
    {
      async publish(channel: string, event: Record<string, unknown>, meta?: Record<string, unknown>) {
        published = { channel, event, meta };
      }
    } as any,
    {
      prepareEvent(event: Record<string, unknown>) {
        return {
          eventType: 'ping',
          id: '123-1',
          payload: JSON.stringify(event),
          seq: 1,
          ts: 123
        };
      },
      async emitPreparedToUser(userId: string, event: Record<string, unknown>) {
        emitted = { userId, event };
      }
    } as any
  );

  await (worker as any).process({
    type: 'REALTIME_EVENT',
    payload: { channel: 'user:user-1', event: { type: 'ping' } }
  });

  assert.equal(published.channel, 'user:user-1');
  assert.equal(published.meta.streamId, '123-1');
  assert.equal(emitted.userId, 'user-1');
  assert.equal(emitted.event.id, '123-1');
});
