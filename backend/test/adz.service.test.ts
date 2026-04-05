import assert from 'node:assert/strict';
import test from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { AdzService } from '../src/modules/adz/adz.service.js';

test('AdzService.resolveShortLink resolves by shortSlug from link metadata', async () => {
  const prisma = {
    adzLink: {
      async findMany() {
        return [
          {
            id: 'link-1',
            status: 'active',
            url: 'https://shop.example.com/glow',
            data: {
              shortSlug: 'glow01'
            }
          }
        ];
      }
    }
  };

  const service = new AdzService(prisma as any);
  const resolved = await service.resolveShortLink('glow01');

  assert.equal(resolved.id, 'link-1');
  assert.equal(resolved.url, 'https://shop.example.com/glow');
});

test('AdzService.resolveShortLink resolves by persisted shortUrl and ignores archived links', async () => {
  const prisma = {
    adzLink: {
      async findMany() {
        return [
          {
            id: 'link-archived',
            status: 'archived',
            url: 'https://shop.example.com/old',
            data: {
              shortSlug: 'glow01',
              shortUrl: 'https://mylivedealz.com/s/glow01'
            }
          },
          {
            id: 'link-2',
            status: 'active',
            url: 'https://shop.example.com/new',
            data: {
              shortUrl: 'https://mylivedealz.com/s/glow02'
            }
          }
        ];
      }
    }
  };

  const service = new AdzService(prisma as any);
  const resolved = await service.resolveShortLink('glow02');

  assert.equal(resolved.id, 'link-2');
  assert.equal(resolved.url, 'https://shop.example.com/new');
});

test('AdzService.resolveShortLink throws when no active short link matches', async () => {
  const prisma = {
    adzLink: {
      async findMany() {
        return [];
      }
    }
  };

  const service = new AdzService(prisma as any);

  await assert.rejects(
    () => service.resolveShortLink('missing'),
    (error: unknown) => error instanceof NotFoundException
  );
});

test('AdzService.deleteLink deletes an owned link', async () => {
  const deletedIds: string[] = [];
  const prisma = {
    adzLink: {
      async findFirst({ where }: { where: { id: string; userId: string } }) {
        if (where.id === 'link-3' && where.userId === 'creator-1') {
          return {
            id: 'link-3',
            userId: 'creator-1'
          };
        }
        return null;
      },
      async delete({ where }: { where: { id: string } }) {
        deletedIds.push(where.id);
        return { id: where.id };
      }
    }
  };

  const service = new AdzService(prisma as any);
  const result = await service.deleteLink('creator-1', 'link-3');

  assert.deepEqual(result, { id: 'link-3', deleted: true });
  assert.deepEqual(deletedIds, ['link-3']);
});

test('AdzService.deleteLink throws when the link is missing', async () => {
  const prisma = {
    adzLink: {
      async findFirst() {
        return null;
      }
    }
  };

  const service = new AdzService(prisma as any);

  await assert.rejects(
    () => service.deleteLink('creator-1', 'missing-link'),
    (error: unknown) => error instanceof NotFoundException
  );
});
