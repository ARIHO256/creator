import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../../platform/cache/cache.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) {}

  async dashboard(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        OR: [{ subjectUserId: userId }, { reviewerUserId: userId }],
        status: 'PUBLISHED'
      },
      orderBy: { createdAt: 'desc' }
    });

    const score = this.computeAverage(reviews);
    const trends = this.bucketTrends(reviews);
    return { score, trends, total: reviews.length };
  }

  async summary(userId: string) {
    const received = await this.prisma.review.findMany({
      where: { subjectUserId: userId, status: 'PUBLISHED' },
      select: { ratingOverall: true, isPublic: true }
    });

    const average = this.computeAverage(received);
    const total = received.length;
    const publicCount = received.filter((review) => review.isPublic).length;
    return { total, publicCount, average };
  }

  async list(userId: string, scope?: 'received' | 'authored') {
    const where =
      scope === 'authored'
        ? { reviewerUserId: userId }
        : scope === 'received'
          ? { subjectUserId: userId }
          : { OR: [{ reviewerUserId: userId }, { subjectUserId: userId }] };

    const reviews = await this.prisma.review.findMany({
      where,
      include: { replies: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });

    return reviews;
  }

  async create(userId: string, payload: CreateReviewDto) {
    this.assertRating(payload.ratingOverall);
    const subjectUserId = await this.resolveSubjectUser(payload);

    return this.prisma.review.create({
      data: {
        reviewerUserId: userId,
        subjectType: payload.subjectType ?? 'CREATOR',
        subjectId: payload.subjectId,
        subjectUserId,
        orderId: payload.orderId,
        sessionId: payload.sessionId,
        campaignId: payload.campaignId,
        title: payload.title,
        buyerName: payload.buyerName,
        buyerType: payload.buyerType,
        roleTarget: payload.roleTarget,
        itemType: payload.itemType,
        channel: payload.channel,
        marketplace: payload.marketplace,
        mldzSurface: payload.mldzSurface,
        sentiment: payload.sentiment,
        requiresResponse: payload.requiresResponse ?? false,
        ratingOverall: payload.ratingOverall,
        ratingBreakdown: payload.ratingBreakdown as Prisma.InputJsonValue | undefined,
        quickTags: payload.quickTags as Prisma.InputJsonValue | undefined,
        issueTags: payload.issueTags as Prisma.InputJsonValue | undefined,
        reviewText: payload.reviewText,
        wouldJoinAgain: payload.wouldJoinAgain,
        transactionIntent: payload.transactionIntent,
        isPublic: payload.isPublic ?? true,
        isAnonymous: payload.isAnonymous ?? false,
        status: 'PUBLISHED',
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async update(userId: string, id: string, payload: UpdateReviewDto) {
    const review = await this.prisma.review.findFirst({
      where: { id, reviewerUserId: userId }
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (payload.ratingOverall !== undefined) {
      this.assertRating(payload.ratingOverall);
    }

    const resolvedAt = payload.resolvedAt ? this.parseDate(payload.resolvedAt, 'resolvedAt') : undefined;
    const flaggedAt = payload.flaggedAt ? this.parseDate(payload.flaggedAt, 'flaggedAt') : undefined;
    const shouldFlag = payload.status === 'FLAGGED';

    return this.prisma.review.update({
      where: { id: review.id },
      data: {
        ratingOverall: payload.ratingOverall ?? undefined,
        ratingBreakdown: payload.ratingBreakdown as Prisma.InputJsonValue | undefined,
        quickTags: payload.quickTags as Prisma.InputJsonValue | undefined,
        issueTags: payload.issueTags as Prisma.InputJsonValue | undefined,
        reviewText: payload.reviewText ?? undefined,
        title: payload.title ?? undefined,
        buyerName: payload.buyerName ?? undefined,
        buyerType: payload.buyerType ?? undefined,
        roleTarget: payload.roleTarget ?? undefined,
        itemType: payload.itemType ?? undefined,
        channel: payload.channel ?? undefined,
        marketplace: payload.marketplace ?? undefined,
        mldzSurface: payload.mldzSurface ?? undefined,
        sentiment: payload.sentiment ?? undefined,
        requiresResponse: payload.requiresResponse ?? undefined,
        wouldJoinAgain: payload.wouldJoinAgain ?? undefined,
        transactionIntent: payload.transactionIntent ?? undefined,
        isPublic: payload.isPublic ?? undefined,
        isAnonymous: payload.isAnonymous ?? undefined,
        status: payload.status ?? undefined,
        resolvedAt: resolvedAt ?? undefined,
        flaggedAt: shouldFlag ? flaggedAt ?? new Date() : flaggedAt ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async reply(userId: string, reviewId: string, body: string, visibility?: 'PUBLIC' | 'PRIVATE') {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.prisma.reviewReply.create({
      data: {
        reviewId: review.id,
        authorUserId: userId,
        body,
        visibility: visibility ?? 'PUBLIC'
      }
    });
  }

  async insights(userId: string, filters?: {
    channel?: string;
    marketplace?: string;
    mldzSurface?: string;
    roleTarget?: string;
    itemType?: string;
    minRating?: number;
    status?: 'PUBLISHED' | 'HIDDEN' | 'FLAGGED';
    since?: string;
  }) {
    const cacheKey = `reviews:insights:${userId}:${JSON.stringify({
      channel: filters?.channel ?? null,
      marketplace: filters?.marketplace ?? null,
      mldzSurface: filters?.mldzSurface ?? null,
      roleTarget: filters?.roleTarget ?? null,
      itemType: filters?.itemType ?? null,
      minRating: typeof filters?.minRating === 'number' ? filters.minRating : null,
      status: filters?.status ?? null,
      since: filters?.since ?? null
    })}`;

    return this.cache.getOrSet(cacheKey, 15_000, async () => {
      const since = filters?.since ? this.parseDate(filters.since, 'since') : undefined;
      const where: Prisma.ReviewWhereInput = {
        subjectUserId: userId,
        status: filters?.status,
        channel: filters?.channel,
        marketplace: filters?.marketplace,
        mldzSurface: filters?.mldzSurface,
        roleTarget: filters?.roleTarget,
        itemType: filters?.itemType,
        ratingOverall: typeof filters?.minRating === 'number' ? { gte: filters.minRating } : undefined,
        createdAt: since ? { gte: since } : undefined
      };

      const reviews = await this.prisma.review.findMany({
        where,
        include: { replies: true },
        orderBy: { createdAt: 'desc' }
      });

      if (reviews.length === 0) {
        return this.emptyInsights();
      }

      const total = reviews.length;
      const average = this.computeAverage(reviews);
      const replied = reviews.filter((review) => review.replies.length > 0).length;
      const responseRate = total ? Math.round((replied / total) * 100) : 0;
      const needsReply = reviews.filter((review) => review.requiresResponse && review.replies.length === 0).length;
      const flagged = reviews.filter((review) => review.status === 'FLAGGED').length;
      const negativePct = total
        ? (reviews.filter((review) => (review.sentiment ?? '').toLowerCase() === 'negative').length / total) * 100
        : 0;
      const trustScore = this.computeTrustScore(average, responseRate, negativePct);

      return {
        kpis: {
          averageRating: average,
          total,
          needsReply,
          flagged,
          responseRate,
          trustScore
        },
        distribution: this.ratingDistribution(reviews),
        trend: this.bucketTrends(reviews),
        themes: this.topThemes(reviews),
        mldz: this.mldzBreakdown(reviews)
      };
    });
  }

  private computeAverage(reviews: Array<{ ratingOverall: number }>) {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + Number(review.ratingOverall || 0), 0);
    return Number((total / reviews.length).toFixed(2));
  }

  private bucketTrends(reviews: Array<{ createdAt: Date; ratingOverall: number }>) {
    const buckets: Record<string, { count: number; avg: number }> = {};
    for (const review of reviews) {
      const key = new Date(review.createdAt).toISOString().slice(0, 10);
      const current = buckets[key] ?? { count: 0, avg: 0 };
      const nextCount = current.count + 1;
      const nextAvg = (current.avg * current.count + review.ratingOverall) / nextCount;
      buckets[key] = { count: nextCount, avg: Number(nextAvg.toFixed(2)) };
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, data]) => ({ date, count: data.count, avg: data.avg }));
  }

  private ratingDistribution(reviews: Array<{ ratingOverall: number }>) {
    const buckets = [5, 4, 3, 2, 1].map((star) => ({ star, count: 0 }));
    for (const review of reviews) {
      const star = Math.max(1, Math.min(5, Math.round(review.ratingOverall)));
      const bucket = buckets.find((b) => b.star === star);
      if (bucket) bucket.count += 1;
    }
    const total = reviews.length || 1;
    return buckets.map((bucket) => ({
      star: bucket.star,
      count: bucket.count,
      pct: Math.round((bucket.count / total) * 100)
    }));
  }

  private topThemes(reviews: Array<{ quickTags: Prisma.JsonValue | null; issueTags: Prisma.JsonValue | null }>) {
    const tally = (source: Prisma.JsonValue | null) => {
      if (!source || !Array.isArray(source)) return [];
      return source.map((item) => String(item));
    };

    const counts = new Map<string, number>();
    reviews.forEach((review) => {
      const tags = [...tally(review.quickTags), ...tally(review.issueTags)];
      tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([label, count]) => ({ label, count }));
  }

  private mldzBreakdown(reviews: Array<{ channel: string | null; mldzSurface: string | null }>) {
    const mldz = reviews.filter((review) => (review.channel ?? '').toLowerCase() === 'mylivedealz');
    const liveCount = mldz.filter((review) => (review.mldzSurface ?? '').toLowerCase().includes('live')).length;
    const shopCount = mldz.filter((review) => (review.mldzSurface ?? '').toLowerCase().includes('shop')).length;
    return { total: mldz.length, liveCount, shopCount };
  }

  private computeTrustScore(avg: number, responseRate: number, negativePct: number) {
    return this.clamp(Math.round(avg * 16 + responseRate * 0.35 - negativePct * 0.45), 0, 100);
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  private emptyInsights() {
    return {
      kpis: {
        averageRating: 0,
        total: 0,
        needsReply: 0,
        flagged: 0,
        responseRate: 0,
        trustScore: 0
      },
      distribution: [],
      trend: [],
      themes: [],
      mldz: { total: 0, liveCount: 0, shopCount: 0 }
    };
  }

  private parseDate(value: string, field: string) {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) {
      throw new BadRequestException(`Invalid ${field} date`);
    }
    return date;
  }

  private assertRating(value: number) {
    if (value < 0 || value > 5) {
      throw new BadRequestException('Rating must be between 0 and 5');
    }
  }

  private async resolveSubjectUser(payload: CreateReviewDto) {
    if (payload.subjectUserId) {
      return payload.subjectUserId;
    }

    if (payload.subjectType === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({ where: { id: payload.subjectId } });
      return seller?.userId ?? null;
    }

    if (payload.subjectType === 'CREATOR') {
      const creator = await this.prisma.creatorProfile.findUnique({ where: { id: payload.subjectId } });
      return creator?.userId ?? null;
    }

    return null;
  }
}
