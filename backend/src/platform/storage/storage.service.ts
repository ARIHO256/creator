import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, promises as fs } from 'fs';
import { basename, dirname, join } from 'path';

export type StoredFile = {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt?: Date | null;
};

@Injectable()
export class StorageService {
  constructor(private readonly configService: ConfigService) {}

  resolvePath(storageKey: string) {
    const root = this.rootDir();
    return join(root, storageKey);
  }

  createReadStream(storageKey: string) {
    return createReadStream(this.resolvePath(storageKey));
  }

  async writeBuffer(namespace: string, fileName: string, buffer: Buffer, mimeType: string, ttlDays?: number) {
    const safeName = basename(fileName).replace(/[^\w.-]+/g, '_');
    const storageKey = join(namespace, safeName);
    const filePath = this.resolvePath(storageKey);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    const sizeBytes = buffer.byteLength;
    const expiresAt = ttlDays ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000) : null;
    return {
      storageKey,
      fileName: safeName,
      mimeType,
      sizeBytes,
      expiresAt
    } as StoredFile;
  }

  private rootDir() {
    return String(this.configService.get('storage.rootDir') ?? join(process.cwd(), 'storage'));
  }
}
