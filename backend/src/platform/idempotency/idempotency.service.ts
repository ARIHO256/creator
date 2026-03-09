import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export type IdempotencyClaim = {
  userId: string;
  key: string;
  method: string;
  route: string;
  requestHash?: string | null;
};

@Injectable()
export class IdempotencyService {
  private lastCleanupAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async claim(input: IdempotencyClaim) {
    await this.cleanupIfNeeded();
    const expiresAt = new Date(Date.now() + this.ttlMs());

    try {
      await this.prisma.idempotencyKey.create({
        data: {
          userId: input.userId,
          key: input.key,
          method: input.method,
          route: input.route,
          requestHash: input.requestHash ?? null,
          expiresAt
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.idempotencyKey.findUnique({
          where: { userId_key: { userId: input.userId, key: input.key } }
        });

        if (!existing) {
          throw new ConflictException('Idempotency key already used');
        }

        if (existing.requestHash && input.requestHash && existing.requestHash !== input.requestHash) {
          throw new ConflictException('Idempotency key reused with a different payload');
        }

        if (existing.method !== input.method || existing.route !== input.route) {
          throw new ConflictException('Idempotency key reused for a different request');
        }

        throw new ConflictException('Duplicate request');
      }

      throw error;
    }
  }

  private ttlMs() {
    return Number(this.configService.get<number>('idempotency.ttlMs') ?? 86_400_000);
  }

  private async cleanupIfNeeded() {
    const now = Date.now();
    if (now - this.lastCleanupAt < 10 * 60_000) {
      return;
    }
    this.lastCleanupAt = now;
    await this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date(now) } }
    });
  }
}
