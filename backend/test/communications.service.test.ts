import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunicationsService } from '../src/modules/communications/communications.service.js';

test('CommunicationsService creates thread and message', async () => {
  const threads = new Map<string, any>();
  const messages: any[] = [];

  const prisma = {
    messageThread: {
      async findFirst({ where }: any) {
        const existing = threads.get(where.id);
        return existing && existing.userId === where.userId ? existing : null;
      },
      async create({ data }: any) {
        const record = { ...data, createdAt: new Date(), updatedAt: new Date(), lastMessageAt: null };
        threads.set(record.id, record);
        return record;
      },
      async update({ where, data }: any) {
        const existing = threads.get(where.id);
        const updated = { ...existing, ...data, updatedAt: new Date() };
        threads.set(where.id, updated);
        return updated;
      },
      async findMany() {
        return Array.from(threads.values());
      }
    },
    message: {
      async create({ data }: any) {
        const record = { ...data, id: `msg_${messages.length + 1}`, createdAt: new Date() };
        messages.push(record);
        return record;
      },
      async findMany({ where }: any) {
        return messages.filter((message) => message.threadId === where.threadId);
      }
    },
    supportContent: { async findMany() { return []; } },
    supportTicket: { async findMany() { return []; } },
    workspaceSetting: { async findUnique() { return null; } }
  };

  const audit = { async log() {} };
  const realtime = { async publishUserEvent() {} };
  const jobsService = { async enqueue() {} };
  const service = new CommunicationsService(prisma as any, audit as any, realtime as any, jobsService as any);
  const response = await service.sendMessage('user-1', 'SELLER', 'thread-1', { text: 'hello', lang: 'en' });

  assert.equal(response.thread.id, 'thread-1');
  assert.equal(response.messages.length, 1);
  assert.equal(response.messages[0].body, 'hello');
  assert.equal(threads.get('thread-1').metadata.workspaceRole, 'SELLER');
});

test('CommunicationsService marks thread as read', async () => {
  const now = new Date();
  const threads = new Map<string, any>([
    [
      'thread-1',
      {
        id: 'thread-1',
        userId: 'user-1',
        status: 'open',
        metadata: { workspaceRole: 'SELLER' },
        lastMessageAt: now,
        lastMessageFromRole: 'seller',
        lastReadAt: null,
        createdAt: now,
        updatedAt: now
      }
    ]
  ]);
  const messages = [
    {
      id: 'msg-1',
      threadId: 'thread-1',
      senderUserId: 'user-2',
      senderRole: 'seller',
      body: 'ping',
      lang: 'en',
      createdAt: now
    }
  ];

  const prisma = {
    messageThread: {
      async findFirst({ where }: any) {
        const existing = threads.get(where.id);
        return existing && existing.userId === where.userId ? existing : null;
      },
      async update({ where, data }: any) {
        const existing = threads.get(where.id);
        const updated = { ...existing, ...data, updatedAt: new Date() };
        threads.set(where.id, updated);
        return updated;
      },
      async updateMany() {
        return { count: threads.size };
      },
      async findMany() {
        return Array.from(threads.values());
      }
    },
    message: {
      async findMany({ where }: any) {
        return messages.filter((message) => message.threadId === where.threadId);
      }
    },
    supportContent: { async findMany() { return []; } },
    supportTicket: { async findMany() { return []; } },
    workspaceSetting: { async findUnique() { return null; } }
  };

  const audit = { async log() {} };
  const realtime = { async publishUserEvent() {} };
  const jobsService = { async enqueue() {} };
  const service = new CommunicationsService(prisma as any, audit as any, realtime as any, jobsService as any);
  const response = await service.markThreadRead('user-1', 'SELLER', 'thread-1');

  const updated = threads.get('thread-1');
  assert.ok(updated.lastReadAt instanceof Date);
  assert.equal(response.thread.id, 'thread-1');
});

test('CommunicationsService hides threads from other workspace roles', async () => {
  const now = new Date();
  const prisma = {
    messageThread: {
      async findMany() {
        return [
          { id: 'seller-thread', userId: 'user-1', metadata: { workspaceRole: 'SELLER' }, createdAt: now, updatedAt: now, status: 'open', lastMessageAt: null, lastMessageFromRole: null, lastReadAt: null, subject: null, channel: null, priority: null },
          { id: 'provider-thread', userId: 'user-1', metadata: { workspaceRole: 'PROVIDER' }, createdAt: now, updatedAt: now, status: 'open', lastMessageAt: null, lastMessageFromRole: null, lastReadAt: null, subject: null, channel: null, priority: null }
        ];
      }
    },
    message: { async findMany() { return []; } },
    supportContent: { async findMany() { return []; } },
    supportTicket: { async findMany() { return []; } },
    workspaceSetting: { async findUnique() { return null; } }
  };

  const service = new CommunicationsService(prisma as any, { async log() {} } as any, { async publishUserEvent() {} } as any, { async enqueue() {} } as any);
  const response = await service.messages('user-1', 'SELLER');

  assert.deepEqual(response.threads.map((thread: any) => thread.id), ['seller-thread']);
});
