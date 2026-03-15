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
    async fetchAndLockBatch(_workerId: string, _lockTtlMs: number, limit: number) {
      return queue.splice(0, limit);
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
  (worker as any).scheduleAfter = () => undefined;
  (worker as any).process = async () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 10));
    inFlight -= 1;
  };

  await (worker as any).tick();

  assert.equal(maxInFlight, 2);
});

test('JobsWorker limits claims to configured queues and hot-polls on full batches', async () => {
  const scheduleDelays: number[] = [];
  let seenQueues: string[] | undefined;
  const worker = new JobsWorker(
    {
      async fetchAndLockBatch(_workerId: string, _lockTtlMs: number, _limit: number, queues?: string[]) {
        seenQueues = queues;
        return [{ id: 'job-1', type: 'TEST', payload: {} }];
      },
      async markCompleted() {
        return undefined;
      },
      async markFailed() {
        return undefined;
      }
    } as any,
    createConfigService({
      'jobs.workerBatch': 1,
      'jobs.workerConcurrency': 1,
      'jobs.lockTtlMs': 1000,
      'jobs.workerId': 'worker-moderation',
      'jobs.workerPollMs': 2000,
      'jobs.workerBusyPollMs': 25,
      'jobs.workerQueues': ['moderation', 'realtime']
    }) as any,
    {} as any
  );

  (worker as any).running = true;
  (worker as any).scheduleAfter = (delay: number) => {
    scheduleDelays.push(delay);
  };
  (worker as any).process = async () => undefined;

  await (worker as any).tick();

  assert.deepEqual(seenQueues, ['moderation', 'realtime']);
  assert.deepEqual(scheduleDelays, [25]);
});

test('JobsWorker batches audit jobs through AuditService before processing the rest', async () => {
  const completed: string[] = [];
  let persistedEvents: any[] = [];
  let processedNonAudit = 0;

  const worker = new JobsWorker(
    {
      async fetchAndLockBatch() {
        return [
          { id: 'audit-1', type: 'AUDIT_EVENT', payload: { action: 'one' } },
          { id: 'audit-2', type: 'AUDIT_EVENT', payload: { action: 'two' } },
          { id: 'job-3', type: 'TEST', payload: {} }
        ];
      },
      async markCompleted(id: string) {
        completed.push(id);
        return undefined;
      },
      async markFailed() {
        return undefined;
      }
    } as any,
    createConfigService({
      'jobs.workerBatch': 3,
      'jobs.workerConcurrency': 2,
      'jobs.lockTtlMs': 1000,
      'jobs.workerId': 'worker-audit',
      'jobs.workerPollMs': 2000,
      'jobs.workerBusyPollMs': 50
    }) as any,
    {} as any,
    {
      async persistMany(events: any[]) {
        persistedEvents = events;
      }
    } as any
  );

  (worker as any).running = true;
  (worker as any).scheduleAfter = () => undefined;
  (worker as any).process = async () => {
    processedNonAudit += 1;
  };

  await (worker as any).tick();

  assert.deepEqual(persistedEvents, [{ action: 'one' }, { action: 'two' }]);
  assert.deepEqual(completed, ['audit-1', 'audit-2', 'job-3']);
  assert.equal(processedNonAudit, 1);
});

test('JobsWorker publishes realtime events with shared stream metadata', async () => {
  let published: any = null;
  let emitted: any = null;
  let deliveryAttempt: any = null;

  const worker = new JobsWorker(
    {} as any,
    createConfigService({ 'realtime.deliveryMaxAttempts': 5 }) as any,
    {} as any,
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
      },
      async hasClient() {
        return true;
      }
    } as any,
    {
      async recordAttempt(userId: string, eventId: string, delivered: boolean) {
        deliveryAttempt = { userId, eventId, delivered };
      }
    } as any,
    undefined
  );

  await (worker as any).process({
    type: 'REALTIME_EVENT',
    payload: { channel: 'user:user-1', event: { type: 'ping', id: '123-1' } }
  });

  assert.equal(published.channel, 'user:user-1');
  assert.equal(published.meta.streamId, '123-1');
  assert.equal(emitted.userId, 'user-1');
  assert.equal(emitted.event.id, '123-1');
  assert.deepEqual(deliveryAttempt, { userId: 'user-1', eventId: '123-1', delivered: true });
});

test('JobsWorker delegates queued auth registrations to AuthService', async () => {
  let payloadSeen: any = null;

  const worker = new JobsWorker(
    {} as any,
    createConfigService() as any,
    {} as any,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      get() {
        return {
          async completeQueuedRegistration(payload: Record<string, unknown>) {
            payloadSeen = payload;
          }
        };
      }
    } as any
  );

  await (worker as any).process({
    type: 'AUTH_REGISTER',
    payload: { email: 'seller@example.com', encryptedPassword: 'ciphertext' }
  });

  assert.equal(payloadSeen.email, 'seller@example.com');
  assert.equal(payloadSeen.encryptedPassword, 'ciphertext');
});
