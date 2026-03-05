import { Injectable, Logger } from '@nestjs/common';
import { buildSeedData } from '../legacy/seed/buildSeedData.js';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class PrismaAppStateStore {
  private readonly logger = new Logger(PrismaAppStateStore.name);
  private readonly snapshotId = process.env.APP_STATE_SNAPSHOT_ID ?? 'creator-app-main';
  private cache: Record<string, any> | null = null;
  private readyPromise: Promise<void> | null = null;
  private flushChain: Promise<void> = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  async init() {
    if (!this.readyPromise) {
      this.readyPromise = this.ensureLoaded();
    }
    return this.readyPromise;
  }

  load() {
    if (!this.cache) {
      throw new Error('PrismaAppStateStore has not been initialized yet.');
    }
    return this.cache;
  }

  snapshot() {
    return structuredClone(this.load());
  }

  update(mutator: (db: Record<string, any>) => any) {
    const db = this.load();
    const result = mutator(db);

    if (!db.meta || typeof db.meta !== 'object') {
      db.meta = {};
    }
    db.meta.updatedAt = new Date().toISOString();

    const payload = structuredClone(db);
    this.flushChain = this.flushChain.then(
      () => this.persist(payload),
      () => this.persist(payload)
    );

    return structuredClone(result);
  }

  async whenIdle() {
    await this.flushChain;
  }

  private async ensureLoaded() {
    const record = await this.prisma.creatorAppState.upsert({
      where: { id: this.snapshotId },
      update: {},
      create: {
        id: this.snapshotId,
        payload: buildSeedData()
      }
    });

    this.cache = structuredClone(record.payload as Record<string, any>);
    this.logger.log(`Loaded CreatorAppState snapshot: ${this.snapshotId}`);
  }

  private async persist(payload: Record<string, any>) {
    await this.prisma.creatorAppState.upsert({
      where: { id: this.snapshotId },
      update: { payload },
      create: { id: this.snapshotId, payload }
    });
  }
}
