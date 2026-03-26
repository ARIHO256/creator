import assert from 'node:assert/strict';
import test from 'node:test';
import { MediaService } from '../src/modules/media/media.service.js';

function createMediaService() {
  const fallbackAssets = new Map<string, Record<string, unknown>>();
  const storedBuffers = new Map<string, Buffer>();
  const schemaError = { code: 'P2021' };

  const prisma = {
    mediaAsset: {
      async create() {
        throw schemaError;
      },
      async findMany() {
        throw schemaError;
      },
      async findFirst() {
        throw schemaError;
      }
    },
    userSetting: {
      async upsert({ where, update, create }: any) {
        const key = `${where.userId_key.userId}:${where.userId_key.key}`;
        const payload = fallbackAssets.has(key) ? update.payload : create.payload;
        fallbackAssets.set(key, payload);
        return { payload };
      },
      async findUnique({ where }: any) {
        const key = `${where.userId_key.userId}:${where.userId_key.key}`;
        const payload = fallbackAssets.get(key);
        return payload ? { payload } : null;
      },
      async findFirst({ where }: any) {
        const match = Array.from(fallbackAssets.entries()).find(([key, payload]) => {
          const separatorIndex = key.indexOf(':');
          const storedKey = separatorIndex >= 0 ? key.slice(separatorIndex + 1) : key;
          return storedKey === where.key && Boolean((payload as Record<string, unknown>).isPublic);
        });
        return match ? { payload: match[1] } : null;
      },
      async findMany({ where }: any) {
        return Array.from(fallbackAssets.entries())
          .filter(([key]) => key.startsWith(`${where.userId}:media_asset_fallback:`))
          .map(([, payload]) => ({ payload }));
      },
      async delete({ where }: any) {
        fallbackAssets.delete(`${where.userId_key.userId}:${where.userId_key.key}`);
        return { deleted: true };
      }
    }
  };

  const config = {
    get(key: string) {
      if (key === 'upload.defaultProvider') return 'LOCAL';
      return undefined;
    }
  };

  const jobs = {
    async enqueue() {
      return { id: 'job-1' };
    }
  };

  const storage = {
    async writeBuffer(namespace: string, fileName: string, buffer: Buffer, mimeType: string) {
      const storageKey = `${namespace}/${fileName}`;
      storedBuffers.set(storageKey, buffer);
      return {
        storageKey,
        fileName,
        mimeType,
        sizeBytes: buffer.byteLength,
        expiresAt: null
      };
    },
    createReadStream(storageKey: string) {
      return `stream:${storageKey}`;
    }
  };

  const service = new MediaService(prisma as any, config as any, jobs as any, storage as any);
  (service as any).isMissingSchemaObjectError = (error: unknown) => (error as { code?: string })?.code === 'P2021';

  return { service, fallbackAssets, storedBuffers };
}

test('MediaService.uploadFile falls back to user settings when mediaAsset storage is unavailable', async () => {
  const { service, fallbackAssets, storedBuffers } = createMediaService();

  const result = await service.uploadFile('user-1', {
    name: 'Profile Photo.jpg',
    dataUrl: `data:image/jpeg;base64,${Buffer.from('image-bytes').toString('base64')}`,
    mimeType: 'image/jpeg',
    purpose: 'creator_profile_photo'
  } as any);

  assert.match(String(result.url || ''), /^\/api\/media\/assets\/.+\/content$/);
  assert.match(String(result.storageKey || ''), /^uploads\/user-1\/\d{4}\/\d{2}\//);
  assert.equal(storedBuffers.size, 1);
  assert.equal(fallbackAssets.size, 1);
});

test('MediaService.openAssetContent reads fallback uploads when mediaAsset table is unavailable', async () => {
  const { service } = createMediaService();

  const uploaded = await service.uploadFile('user-1', {
    name: 'Selfie.png',
    dataUrl: `data:image/png;base64,${Buffer.from('selfie-bytes').toString('base64')}`,
    mimeType: 'image/png',
    purpose: 'creator_kyc_selfie'
  } as any);

  const result = await service.openAssetContent('user-1', uploaded.id);

  assert.equal(result.asset.id, uploaded.id);
  assert.equal(result.stream, `stream:${uploaded.storageKey}`);
});
