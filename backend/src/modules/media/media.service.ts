import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.mediaAsset.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async create(userId: string, payload: CreateMediaAssetDto) {
    return this.prisma.mediaAsset.create({
      data: {
        userId,
        name: payload.name,
        kind: payload.kind ?? 'file',
        url: payload.url
      }
    });
  }
}
