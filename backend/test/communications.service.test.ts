import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunicationsService } from '../src/modules/communications/communications.service.js';

test('CommunicationsService creates thread and message', async () => {
  const threads = new Map<string, any>();
  const messages: any[] = [];

  const prisma = {
    messageThread: {
      async findFirst({ where }: any) {
        return threads.get(where.id) ?? null;
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

  const service = new CommunicationsService(prisma as any);
  const response = await service.sendMessage('user-1', 'thread-1', { text: 'hello', lang: 'en' });

  assert.equal(response.thread.id, 'thread-1');
  assert.equal(response.messages.length, 1);
  assert.equal(response.messages[0].body, 'hello');
});
