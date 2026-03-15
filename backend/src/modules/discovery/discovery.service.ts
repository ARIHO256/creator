import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SellerKind, UserRole } from '@prisma/client';
import { serializeListingPublic } from '../../common/serializers/listing.serializer.js';
import { serializePublicSeller } from '../../common/serializers/seller.serializer.js';
import { sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';
import { CacheService } from '../../platform/cache/cache.service.js';
import { PublicReadCacheService } from '../../platform/cache/public-read-cache.service.js';
import { PrismaService, ReadPrismaService } from '../../platform/prisma/prisma.service.js';
import { ListQueryDto, normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
import { CreateInviteDto } from './dto/create-invite.dto.js';
import { SearchService } from '../search/search.service.js';

function moneyLike(value: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }
}

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaRead: ReadPrismaService,
    private readonly searchService: SearchService,
    private readonly cache: CacheService,
    private readonly publicReadCache: PublicReadCacheService
  ) {}

  async sellers(query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    return this.cache.getOrSet(
      this.publicReadCache.discoverySellersKey(skip, take),
      this.publicReadCache.publicReadTtlMs(),
      async () => {
        const sellers = await this.prismaRead.seller.findMany({
          skip,
          take,
          orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }]
        });

        return sellers.map((seller) => serializePublicSeller(seller));
      }
    );
  }

  async warmPublicDiscoveryCache() {
    await this.sellers({ limit: this.publicReadCache.warmListingsLimit() } as ListQueryDto);
  }

  async followSeller(userId: string, sellerId: string, follow: boolean) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    if (!follow) {
      await this.prisma.sellerFollow.deleteMany({ where: { userId, sellerId } });
      return { deleted: true };
    }

    return this.prisma.sellerFollow.upsert({
      where: { userId_sellerId: { userId, sellerId } },
      update: {},
      create: {
        userId,
        sellerId
      }
    });
  }

  async mySellers(userId: string, query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const follows = await this.prisma.sellerFollow.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    });
    const ids = follows.map((entry) => entry.sellerId);
    const sellers = await this.prisma.seller.findMany({ where: { id: { in: ids } } });
    return sellers.map((seller) => serializePublicSeller(seller));
  }

  async followCreator(userId: string, creatorUserId: string, follow: boolean) {
    const creator = await this.prisma.user.findUnique({ where: { id: creatorUserId } });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }
    if (!follow) {
      await this.prisma.creatorFollow.deleteMany({ where: { sellerId: seller.id, creatorUserId } });
      return { deleted: true };
    }
    return this.prisma.creatorFollow.upsert({
      where: { sellerId_creatorUserId: { sellerId: seller.id, creatorUserId } },
      update: {},
      create: {
        sellerId: seller.id,
        creatorUserId
      }
    });
  }

  async myCreators(userId: string, query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    if (!seller) {
      return [];
    }
    const follows = await this.prisma.creatorFollow.findMany({
      where: { sellerId: seller.id },
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    });
    const ids = follows.map((entry) => entry.creatorUserId);
    const creators = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      include: { creatorProfile: true }
    });
    return creators.map((creator) => ({
      id: creator.id,
      handle: creator.creatorProfile?.handle ?? null,
      name: creator.creatorProfile?.name ?? null,
      profile: creator.creatorProfile ?? null
    }));
  }

  async creators(userId: string, query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const creatorProfiles = await this.prisma.creatorProfile.findMany({
      skip,
      take,
      include: {
        user: true
      },
      orderBy: [{ followers: 'desc' }, { rating: 'desc' }, { updatedAt: 'desc' }]
    });

    const creatorUserIds = creatorProfiles.map((profile) => profile.userId);
    const [follows, campaigns, contracts, invites, reviews] = await Promise.all([
      seller
        ? this.prisma.creatorFollow.findMany({
            where: {
              sellerId: seller.id,
              creatorUserId: {
                in: creatorUserIds
              }
            }
          })
        : Promise.resolve([]),
      seller
        ? this.prisma.campaign.findMany({
            where: {
              sellerId: seller.id,
              creatorId: {
                in: creatorUserIds
              }
            },
            include: {
              seller: true,
              creator: {
                include: {
                  creatorProfile: true
                }
              }
            }
          })
        : Promise.resolve([]),
      seller
        ? this.prisma.contract.findMany({
            where: {
              sellerId: seller.id,
              creatorId: {
                in: creatorUserIds
              }
            },
            include: {
              seller: true,
              creator: {
                include: {
                  creatorProfile: true
                }
              },
              campaign: true
            }
          })
        : Promise.resolve([]),
      seller
        ? this.prisma.collaborationInvite.findMany({
            where: {
              sellerId: seller.id,
              recipientUserId: {
                in: creatorUserIds
              }
            }
          })
        : Promise.resolve([]),
      this.prisma.review.findMany({
        where: {
          OR: [
            {
              subjectUserId: {
                in: creatorUserIds
              }
            },
            {
              subjectId: {
                in: creatorProfiles.map((profile) => profile.id)
              }
            }
          ],
          status: 'PUBLISHED'
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const followedCreatorIds = new Set(follows.map((entry) => entry.creatorUserId));

    return creatorProfiles.map((profile) =>
      this.serializeCreatorDiscoveryCard({
        seller,
        profile,
        followed: followedCreatorIds.has(profile.userId),
        campaigns: campaigns.filter((entry) => entry.creatorId === profile.userId),
        contracts: contracts.filter((entry) => entry.creatorId === profile.userId),
        invites: invites.filter((entry) => entry.recipientUserId === profile.userId),
        reviews: reviews.filter((entry) => entry.subjectUserId === profile.userId || entry.subjectId === profile.id)
      })
    );
  }

  async creatorProfile(userId: string, id: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const profile = await this.findCreatorProfile(id);
    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }

    const [follow, campaigns, contracts, invites, reviews, creatorWorkspace] = await Promise.all([
      seller
        ? this.prisma.creatorFollow.findUnique({
            where: {
              sellerId_creatorUserId: {
                sellerId: seller.id,
                creatorUserId: profile.userId
              }
            }
          })
        : Promise.resolve(null),
      this.prisma.campaign.findMany({
        where: {
          creatorId: profile.userId
        },
        include: {
          seller: true,
          creator: {
            include: {
              creatorProfile: true
            }
          }
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 8
      }),
      this.prisma.contract.findMany({
        where: {
          creatorId: profile.userId
        },
        include: {
          seller: true,
          creator: {
            include: {
              creatorProfile: true
            }
          },
          campaign: true,
          tasks: true
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 8
      }),
      this.prisma.collaborationInvite.findMany({
        where: {
          recipientUserId: profile.userId
        },
        include: {
          seller: true,
          campaign: true
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 8
      }),
      this.prisma.review.findMany({
        where: {
          OR: [{ subjectUserId: profile.userId }, { subjectId: profile.id }],
          status: 'PUBLISHED'
        },
        orderBy: { createdAt: 'desc' },
        take: 12
      }),
      this.ensureCreatorWorkspaceProfile(profile.userId, profile)
    ]);

    const deliverablePacks = await this.ensureDeliverablePacks(userId);
    return this.serializeCreatorProfile({
      seller,
      profile,
      followed: Boolean(follow),
      campaigns,
      contracts,
      invites,
      reviews,
      creatorWorkspace,
      deliverablePacks
    });
  }

  async myCreatorsWorkspace(userId: string, query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    if (!seller) {
      return { creators: [] };
    }

    const [contracts, follows, invites, campaigns] = await Promise.all([
      this.prisma.contract.findMany({
        where: {
          sellerId: seller.id
        },
        include: {
          seller: true,
          creator: {
            include: {
              creatorProfile: true
            }
          },
          campaign: true
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
      }),
      this.prisma.creatorFollow.findMany({
        where: {
          sellerId: seller.id
        }
      }),
      this.prisma.collaborationInvite.findMany({
        where: {
          sellerId: seller.id
        },
        include: {
          campaign: true
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
      }),
      this.prisma.campaign.findMany({
        where: {
          sellerId: seller.id
        },
        include: {
          creator: {
            include: {
              creatorProfile: true
            }
          }
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
      })
    ]);

    const followedUserIds = new Set(follows.map((entry) => entry.creatorUserId));
    const candidateUserIds = Array.from(
      new Set([
        ...contracts.map((entry) => entry.creatorId),
        ...follows.map((entry) => entry.creatorUserId),
        ...invites.map((entry) => entry.recipientUserId)
      ].filter(Boolean))
    );

    const profiles = await this.prisma.creatorProfile.findMany({
      where: {
        userId: {
          in: candidateUserIds.slice(skip, skip + take)
        }
      },
      include: {
        user: true
      }
    });

    const profileIds = new Set(profiles.map((entry) => entry.userId));
    const reviews = await this.prisma.review.findMany({
      where: {
        OR: [
          {
            subjectUserId: {
              in: Array.from(profileIds)
            }
          },
          {
            subjectId: {
              in: profiles.map((entry) => entry.id)
            }
          }
        ],
        status: 'PUBLISHED'
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      creators: profiles.map((profile) =>
        this.serializeMyCreatorWorkspace({
          profile,
          followed: followedUserIds.has(profile.userId),
          contracts: contracts.filter((entry) => entry.creatorId === profile.userId),
          invites: invites.filter((entry) => entry.recipientUserId === profile.userId),
          campaigns: campaigns.filter((entry) => entry.creatorId === profile.userId),
          reviews: reviews.filter((entry) => entry.subjectUserId === profile.userId || entry.subjectId === profile.id)
        })
      )
    };
  }

  async opportunities(query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const opportunities = await this.prisma.opportunity.findMany({
      skip,
      take,
      include: { seller: true },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
    });
    return opportunities.map((opportunity) => ({
      ...opportunity,
      seller: opportunity.seller ? serializePublicSeller(opportunity.seller as any) : null
    }));
  }

  async opportunity(id: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: { seller: true }
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    return {
      ...opportunity,
      seller: opportunity.seller ? serializePublicSeller(opportunity.seller as any) : null
    };
  }

  async saveOpportunity(userId: string, opportunityId: string, save: boolean) {
    const opportunity = await this.prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    if (!save) {
      await this.prisma.savedOpportunity.deleteMany({ where: { userId, opportunityId } });
      return { deleted: true };
    }

    return this.prisma.savedOpportunity.upsert({
      where: { userId_opportunityId: { userId, opportunityId } },
      update: {},
      create: { userId, opportunityId }
    });
  }

  async campaignBoard(userId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        OR: [{ creatorId: userId }, { createdByUserId: userId }, { seller: { userId } }]
      },
      include: {
        seller: true,
        creator: {
          include: {
            creatorProfile: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return campaigns.map((campaign) => ({
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      seller: campaign.seller.displayName,
      creator: campaign.creator?.creatorProfile?.name ?? null,
      budget: campaign.budget,
      currency: campaign.currency,
      startAt: campaign.startAt,
      endAt: campaign.endAt
    }));
  }

  async dealzMarketplace(userId: string, query?: ListQueryDto) {
    const { take } = normalizeListQuery(query);
    const [listings, opportunities] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where: { status: 'ACTIVE' },
        include: { seller: true, taxonomyLinks: true },
        orderBy: { createdAt: 'desc' },
        take
      }),
      this.prisma.opportunity.findMany({
        where: { status: { in: ['OPEN', 'INVITE_ONLY'] } },
        include: { seller: true },
        orderBy: { createdAt: 'desc' },
        take
      })
    ]);

    return {
      listings: listings.map((listing) => serializeListingPublic(listing as any)),
      opportunities: opportunities.map((opportunity) => ({
        ...opportunity,
        seller: opportunity.seller ? serializePublicSeller(opportunity.seller as any) : null
      }))
    };
  }

  async invites(userId: string, query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const invites = await this.prisma.collaborationInvite.findMany({
      where: { recipientUserId: userId },
      skip,
      take,
      include: {
        seller: true,
        sender: {
          include: {
            creatorProfile: true,
            sellerProfile: true
          }
        },
        opportunity: true,
        campaign: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    return invites.map((invite) => this.serializeInvite(invite));
  }

  async createInvite(userId: string, payload: CreateInviteDto) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { sellerProfile: true }
    });

    if (!actor) {
      throw new NotFoundException('Sender not found');
    }

    if (!actor.sellerProfile && !['ADMIN', 'SUPPORT'].includes(actor.role ?? '')) {
      throw new ForbiddenException('Only seller or provider workspaces can send creator invites');
    }

    const recipient = await this.resolveInviteRecipient(payload);
    const campaign = payload.campaignId
      ? await this.prisma.campaign.findFirst({
          where: actor.sellerProfile
            ? {
                id: payload.campaignId,
                sellerId: actor.sellerProfile.id
              }
            : { id: payload.campaignId }
        })
      : null;

    const seller = actor.sellerProfile;
    const sellerName = seller?.displayName ?? actor.email;
    const sellerHandle = seller?.handle ? `@${seller.handle}` : null;
    const campaignTitle = campaign?.title || payload.campaignTitle || payload.title || 'MyLiveDealz collaboration';
    const estimatedValue =
      payload.estimatedValue ??
      payload.baseFee ??
      (typeof payload.metadata?.estimatedValue === 'number' ? payload.metadata.estimatedValue : undefined) ??
      null;
    const messageShort =
      payload.messageShort ??
      (typeof payload.message === 'string' ? payload.message.trim().slice(0, 160) : undefined) ??
      `You have a new invite from ${sellerName}.`;

    const metadata = sanitizePayload(
      {
        ...(payload.metadata ?? {}),
        campaignId: campaign?.id ?? null,
        campaignTitle,
        type: payload.type ?? null,
        category: payload.category ?? null,
        region: payload.region ?? null,
        baseFee: payload.baseFee ?? null,
        currency: payload.currency ?? 'USD',
        commissionPct: payload.commissionPct ?? 0,
        estimatedValue,
        fitScore: payload.fitScore ?? null,
        fitReason: payload.fitReason ?? null,
        messageShort,
        supplierDescription: payload.supplierDescription ?? seller?.description ?? null,
        supplierRating: payload.supplierRating ?? seller?.rating ?? null,
        sellerName,
        sellerHandle,
        sellerInitials: this.buildInitials(sellerName, 'SP'),
        creatorName: recipient.name,
        creatorHandle: `@${recipient.handle}`,
        creatorUserId: recipient.userId,
        creatorProfileId: recipient.id
      },
      { maxDepth: 8, maxArrayLength: 250, maxKeys: 250 }
    ) as Prisma.InputJsonValue;

    const invite = await this.prisma.collaborationInvite.create({
      data: {
        sellerId: seller?.id ?? null,
        campaignId: campaign?.id ?? null,
        senderUserId: userId,
        recipientUserId: recipient.userId,
        title: payload.title || `Invite to collaborate on ${campaignTitle}`,
        message: payload.message ?? null,
        metadata
      },
      include: {
        seller: true,
        sender: {
          include: {
            creatorProfile: true,
            sellerProfile: true
          }
        },
        opportunity: true,
        campaign: true
      }
    });

    await this.prisma.notification.create({
      data: {
        userId: recipient.userId,
        kind: 'collaboration_invite',
        title: `New invite from ${sellerName}`,
        body: `${sellerName} invited you to collaborate on ${campaignTitle}.`,
        metadata: {
          ...(metadata as Record<string, unknown>),
          workspaceRole: 'CREATOR'
        } as Prisma.InputJsonValue
      }
    });

    return this.serializeInvite(invite);
  }

  async respondInvite(userId: string, inviteId: string, status: string) {
    const invite = await this.prisma.collaborationInvite.findFirst({
      where: { id: inviteId, recipientUserId: userId },
      include: {
        seller: true,
        sender: {
          include: {
            sellerProfile: true,
            creatorProfile: true
          }
        },
        recipient: {
          include: {
            creatorProfile: true,
            sellerProfile: true
          }
        },
        campaign: true
      }
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    const nextStatus = this.normalizeInviteStatus(status);
    const inviteMetadata = this.normalizeInviteMetadata(invite.metadata);
    const proposal =
      nextStatus === 'ACCEPTED'
        ? await this.ensureProposalForInvite(invite, inviteMetadata, userId)
        : null;
    const updatedMetadata = sanitizePayload(
      {
        ...inviteMetadata,
        respondedAt: new Date().toISOString(),
        proposalId: proposal?.id ?? inviteMetadata.proposalId ?? null,
        proposalStatus: proposal?.status ?? null
      },
      { maxDepth: 8, maxArrayLength: 250, maxKeys: 250 }
    ) as Prisma.InputJsonValue;

    const updatedInvite = await this.prisma.collaborationInvite.update({
      where: { id: inviteId },
      data: {
        status: nextStatus,
        metadata: updatedMetadata
      },
      include: {
        seller: true,
        sender: {
          include: {
            creatorProfile: true,
            sellerProfile: true
          }
        },
        opportunity: true,
        campaign: true
      }
    });

    const creatorName =
      invite.recipient.creatorProfile?.name ??
      invite.recipient.sellerProfile?.displayName ??
      invite.recipient.email;
    const sellerName =
      invite.seller?.displayName ??
      invite.sender.sellerProfile?.displayName ??
      invite.sender.email;
    const campaignTitle = String(
      inviteMetadata.campaignTitle || invite.campaign?.title || invite.title || 'MyLiveDealz collaboration'
    );

    await this.prisma.notification.create({
      data: {
        userId: invite.senderUserId,
        kind: 'collaboration_invite_response',
        title:
          nextStatus === 'ACCEPTED'
            ? `${creatorName} accepted your invite`
            : `${creatorName} declined your invite`,
        body:
          nextStatus === 'ACCEPTED'
            ? `${creatorName} accepted ${campaignTitle}. Negotiation is ready to continue.`
            : `${creatorName} declined ${campaignTitle}.`,
        metadata: sanitizePayload(
          {
            inviteId: invite.id,
            proposalId: proposal?.id ?? null,
            campaignId: invite.campaignId,
            campaignTitle,
            creatorName,
            creatorHandle:
              invite.recipient.creatorProfile?.handle ? `@${invite.recipient.creatorProfile.handle}` : null,
            status: nextStatus,
            workspaceRole: this.resolveNotificationRole({
              role: invite.sender.role ?? undefined,
              creatorProfileId: invite.sender.creatorProfile?.id ?? null,
              sellerKind: invite.sender.sellerProfile?.kind ?? null
            })
          },
          { maxDepth: 6, maxArrayLength: 50, maxKeys: 50 }
        ) as Prisma.InputJsonValue
      }
    });

    return {
      ...this.serializeInvite(updatedInvite),
      proposalId: proposal?.id ?? null
    };
  }

  private resolveNotificationRole(params: {
    role?: UserRole | string | null;
    creatorProfileId?: string | null;
    sellerKind?: SellerKind | string | null;
  }) {
    const explicitRole = String(params.role || '').toUpperCase();
    if (explicitRole) {
      return explicitRole;
    }
    if (params.creatorProfileId) {
      return 'CREATOR';
    }
    if (String(params.sellerKind || '').toUpperCase() === 'PROVIDER') {
      return 'PROVIDER';
    }
    return 'SELLER';
  }

  async search(userId: string, query?: SearchQueryDto) {
    const q = String(query?.q ?? '').trim();
    if (!q) {
      return { sellers: [], listings: [], opportunities: [] };
    }
    const searchResults = await this.searchService.searchListings({ q });
    const listingIds = searchResults.results.map((entry: any) => entry.id).filter(Boolean);
    const [sellers, listings, opportunities] = await Promise.all([
      this.prisma.seller.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { displayName: { contains: q } },
            { handle: { contains: q } }
          ]
        },
        take: 20
      }),
      listingIds.length
        ? this.prisma.marketplaceListing.findMany({ where: { id: { in: listingIds } } })
        : this.prisma.marketplaceListing.findMany({
            where: {
              OR: [{ title: { contains: q } }, { description: { contains: q } }, { sku: { contains: q } }]
            },
            take: 20
          }),
      this.prisma.opportunity.findMany({
        where: {
          OR: [{ title: { contains: q } }, { description: { contains: q } }]
        },
        include: { seller: true },
        take: 20
      })
    ]);
    return {
      sellers: sellers.map((seller) => serializePublicSeller(seller)),
      listings: listings.map((listing) => serializeListingPublic(listing)),
      opportunities: opportunities.map((opportunity) => ({
        ...opportunity,
        seller: opportunity.seller ? serializePublicSeller(opportunity.seller as any) : null
      }))
    };
  }

  private normalizeInviteStatus(status: string) {
    const normalized = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
    if (['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'].includes(normalized)) {
      return normalized as 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
    }
    return 'PENDING';
  }

  private async resolveInviteRecipient(payload: CreateInviteDto) {
    if (payload.recipientUserId?.trim()) {
      const direct = await this.prisma.creatorProfile.findUnique({
        where: { userId: payload.recipientUserId.trim() }
      });
      if (direct) {
        return direct;
      }
    }

    const rawHandle = String(payload.creatorHandle || '').trim();
    if (!rawHandle) {
      throw new BadRequestException('Invite recipient handle is required');
    }

    const normalized = rawHandle.replace(/^@/, '').trim().toLowerCase();
    const candidates = await this.prisma.creatorProfile.findMany({
      where: {
        OR: [
          { handle: normalized },
          { handle: rawHandle.trim() }
        ]
      },
      take: 1
    });

    if (candidates[0]) {
      return candidates[0];
    }

    throw new NotFoundException(`Creator ${rawHandle} was not found`);
  }

  private normalizeInviteMetadata(value: unknown) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private async findCreatorProfile(id: string) {
    const normalized = String(id || '').trim();
    if (!normalized) {
      return null;
    }
    const handle = normalized.replace(/^@/, '').toLowerCase();

    const profiles = await this.prisma.creatorProfile.findMany({
      where: {
        OR: [{ id: normalized }, { userId: normalized }, { handle }]
      },
      include: {
        user: true
      },
      take: 1
    });

    return profiles[0] ?? null;
  }

  private serializeCreatorDiscoveryCard(params: {
    seller: { id: string; category: string | null; categories: string | null; region: string | null } | null;
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>;
    followed: boolean;
    campaigns: Array<Prisma.CampaignGetPayload<{ include: { seller: true; creator: { include: { creatorProfile: true } } } }>>;
    contracts: Array<Prisma.ContractGetPayload<{ include: { seller: true; creator: { include: { creatorProfile: true } }; campaign: true } }>>;
    invites: Array<Prisma.CollaborationInviteGetPayload<{}>>;
    reviews: Array<Prisma.ReviewGetPayload<{}>>;
  }) {
    const categories = this.readStringList(params.profile.categories);
    const languages = this.readStringList(params.profile.languages);
    const regions = this.readStringList(params.profile.regions);
    const activeContracts = params.contracts.filter((entry) =>
      ['ACTIVE', 'PENDING_APPROVAL', 'EXECUTING', 'SIGNED'].includes(String(entry.status))
    );
    const completedContracts = params.contracts.filter((entry) => String(entry.status) === 'COMPLETED');
    const overlap = this.computeCategoryOverlap(params.seller, categories);
    const fitScore = this.computeFitScore(params.profile, overlap, activeContracts.length, params.reviews);
    const recentActiveAt = this.resolveRecentActivityAt(params.profile.updatedAt, params.campaigns, params.contracts, params.invites);
    const rating = this.resolveRating(params.profile.rating, params.reviews);
    const totalSales = Number(params.profile.totalSalesDriven || 0);

    return {
      id: params.profile.userId,
      profileId: params.profile.id,
      name: params.profile.name,
      handle: `@${params.profile.handle}`,
      tagline: params.profile.tagline || this.buildCreatorTagline(categories),
      categories,
      followers: params.profile.followers,
      livesCompleted: params.campaigns.length || completedContracts.length || activeContracts.length,
      ctr: this.computeCtr(params.profile.followers, totalSales, params.reviews.length),
      conversion: this.computeConversion(totalSales, params.profile.followers),
      rating,
      tier: this.formatTier(params.profile.tier),
      badge: this.buildCreatorBadge(params.profile, rating),
      collabStatus: activeContracts.length > 0 ? 'Invite only' : 'Open to collabs',
      region: regions[0] || params.seller?.region || 'Global',
      regions,
      languages: languages.length ? languages : ['English'],
      relationship: this.buildRelationshipLabel(activeContracts.length, completedContracts.length, params.invites.length),
      fitScore,
      fitReason: this.buildFitReason(categories, overlap, params.profile, activeContracts.length),
      followersTrend: params.profile.followers >= 50000 ? 'up' : 'flat',
      livesTrend: params.campaigns.length >= 2 ? 'up' : params.campaigns.length === 1 ? 'flat' : 'down',
      orderTrend: totalSales > 0 ? 'up' : 'flat',
      trustBadges: this.buildTrustBadges(params.profile, rating, activeContracts.length),
      lastActive: this.formatRelativeWorkspaceActivity(recentActiveAt),
      platforms: this.buildCreatorPlatforms(params.profile),
      isActivelyCollaborating: activeContracts.length > 0,
      hasActiveCampaigns: params.campaigns.some((entry) => ['ACTIVE', 'DRAFT'].includes(String(entry.status))),
      isSaved: params.followed
    };
  }

  private serializeMyCreatorWorkspace(params: {
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>;
    followed: boolean;
    contracts: Array<Prisma.ContractGetPayload<{ include: { seller: true; creator: { include: { creatorProfile: true } }; campaign: true } }>>;
    invites: Array<Prisma.CollaborationInviteGetPayload<{ include: { campaign: true } }>>;
    campaigns: Array<Prisma.CampaignGetPayload<{ include: { creator: { include: { creatorProfile: true } } } }>>;
    reviews: Array<Prisma.ReviewGetPayload<{}>>;
  }) {
    const categories = this.readStringList(params.profile.categories);
    const activeContracts = params.contracts.filter((entry) =>
      ['ACTIVE', 'PENDING_APPROVAL', 'EXECUTING', 'SIGNED'].includes(String(entry.status))
    );
    const completedContracts = params.contracts.filter((entry) => String(entry.status) === 'COMPLETED');
    const openInvites = params.invites.filter((entry) => String(entry.status) === 'PENDING');
    const latestCampaign = [...params.campaigns].sort((left, right) =>
      String(right.startAt || right.updatedAt || '').localeCompare(String(left.startAt || left.updatedAt || ''))
    )[0];
    const currentValue = activeContracts.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
    const lifetimeRevenue = params.contracts.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
    const rating = this.resolveRating(params.profile.rating, params.reviews);

    return {
      id: params.profile.userId,
      profileId: params.profile.id,
      name: params.profile.name,
      handle: `@${params.profile.handle}`,
      initials: this.buildInitials(params.profile.name, params.profile.handle),
      tagline: params.profile.tagline || this.buildCreatorTagline(categories),
      categories,
      rating,
      followers: params.profile.followers,
      totalSalesDriven: Number(params.profile.totalSalesDriven || 0),
      relationship: activeContracts.length > 0 ? 'Active collab' : 'Past collab',
      following: params.followed,
      favourite: false,
      nextLive: latestCampaign?.startAt ? this.formatCampaignSlot(latestCampaign.startAt) : 'Not scheduled',
      nextAction:
        openInvites.length > 0
          ? `${openInvites.length} pending invite${openInvites.length === 1 ? '' : 's'}`
          : activeContracts.length > 0
            ? 'Review active deliverables'
            : 'No active deliverables',
      activeContracts: activeContracts.length,
      activeContractIds: activeContracts.map((entry) => entry.id),
      currentValue,
      lifetimeRevenue,
      activeCampaigns: params.campaigns
        .filter((entry) => ['ACTIVE', 'DRAFT'].includes(String(entry.status)))
        .slice(0, 3)
        .map((entry) => ({
          id: entry.id,
          name: entry.title,
          stage: this.formatCampaignStatus(entry.status)
        })),
      queues: {
        pendingSupplier: openInvites.length,
        pendingAdmin: activeContracts.filter((entry) => this.readString(entry.metadata, 'approvalMode') === 'Manual').length,
        changesRequested: 0
      }
    };
  }

  private serializeCreatorProfile(params: {
    seller: { id: string; category: string | null; categories: string | null; region: string | null } | null;
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>;
    followed: boolean;
    campaigns: Array<Prisma.CampaignGetPayload<{ include: { seller: true; creator: { include: { creatorProfile: true } } } }>>;
    contracts: Array<Prisma.ContractGetPayload<{ include: { seller: true; creator: { include: { creatorProfile: true } }; campaign: true; tasks: true } }>>;
    invites: Array<Prisma.CollaborationInviteGetPayload<{ include: { seller: true; campaign: true } }>>;
    reviews: Array<Prisma.ReviewGetPayload<{}>>;
    creatorWorkspace: Record<string, unknown>;
    deliverablePacks: Array<Record<string, unknown>>;
  }) {
    const categories = this.readStringList(params.profile.categories);
    const languages = this.readStringList(params.profile.languages);
    const markets = this.readStringList(params.profile.regions);
    const activeContracts = params.contracts.filter((entry) =>
      ['ACTIVE', 'PENDING_APPROVAL', 'EXECUTING', 'SIGNED'].includes(String(entry.status))
    );
    const overlap = this.computeCategoryOverlap(params.seller, categories);
    const fitScore = this.computeFitScore(params.profile, overlap, activeContracts.length, params.reviews);
    const rating = this.resolveRating(params.profile.rating, params.reviews);
    const totalSales = Number(params.profile.totalSalesDriven || 0);
    const compatibility = this.buildCompatibilityPayload(params.profile, categories, overlap, fitScore, params.seller);
    const workspace = this.normalizeCreatorWorkspacePayload(params.creatorWorkspace, params.profile);

    return {
      creator: {
        id: params.profile.userId,
        profileId: params.profile.id,
        name: params.profile.name,
        handle: `@${params.profile.handle}`,
        tier: `${this.formatTier(params.profile.tier)} Tier`,
        verified: params.profile.isKycVerified,
        region: markets[0] || params.seller?.region || 'Global',
        initials: this.buildInitials(params.profile.name, params.profile.handle),
        categories,
        tagline: params.profile.tagline || this.buildCreatorTagline(categories),
        bio: params.profile.bio || workspace.about || '',
        languages,
        markets,
        followers: params.profile.followers,
        followersLabel: this.formatCompactNumber(params.profile.followers),
        avgLiveViewersLabel: this.formatCompactNumber(this.estimateLiveViewers(params.profile.followers)),
        totalSalesDrivenLabel: moneyLike(totalSales),
        rating,
        completedCollabs: params.contracts.length,
        reviewCount: params.reviews.length,
        isFollowing: params.followed
      },
      performance: this.buildPerformanceCards(params.profile, params.contracts, params.reviews),
      portfolio: this.buildCreatorPortfolio(params.campaigns, params.contracts, workspace),
      liveSlots: this.buildLiveSlots(params.campaigns, workspace),
      reviews: this.buildReviewCards(params.reviews, params.campaigns),
      socials: workspace.socials,
      pastCampaigns: this.buildPastCampaignCards(params.campaigns, params.contracts),
      tags: workspace.tags.length ? workspace.tags : categories,
      compatibility,
      quickFacts: this.buildQuickFacts(params.profile, languages, markets, activeContracts.length),
      deckContent: this.buildDeckContent(params.profile, languages, markets, categories, totalSales),
      deliverablePacks: params.deliverablePacks
    };
  }

  private buildPerformanceCards(
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>,
    contracts: Array<Prisma.ContractGetPayload<{ include: { tasks: true } }>>,
    reviews: Array<Prisma.ReviewGetPayload<{}>>
  ) {
    const totalSales = Number(profile.totalSalesDriven || 0);
    const rating = this.resolveRating(profile.rating, reviews);
    return [
      { label: 'Total sales driven', value: moneyLike(totalSales), sub: `Across ${contracts.length} contracts` },
      { label: 'Avg live viewers', value: this.formatCompactNumber(this.estimateLiveViewers(profile.followers)), sub: 'Derived from total followers' },
      { label: 'Conversion rate', value: `${this.computeConversion(totalSales, profile.followers).toFixed(1)}%`, sub: 'Derived from attributed sales and reach' },
      { label: 'Completed collabs', value: String(contracts.length), sub: `${contracts.filter((entry) => String(entry.status) === 'COMPLETED').length} completed` },
      { label: 'Average rating', value: `${rating.toFixed(1)}/5`, sub: `${reviews.length} supplier reviews` },
      { label: 'Return customer rate', value: `${Math.min(75, 30 + contracts.length * 4)}%`, sub: 'Based on repeat seller contracts' }
    ];
  }

  private buildCreatorPortfolio(
    campaigns: Array<Prisma.CampaignGetPayload<{ include: { seller: true } }>>,
    contracts: Array<Prisma.ContractGetPayload<{ include: { seller: true; campaign: true } }>>,
    workspace: Record<string, unknown>
  ) {
    const seed = Array.isArray(workspace.portfolio) ? workspace.portfolio : [];
    if (seed.length > 0) {
      return seed;
    }

    return [...campaigns]
      .slice(0, 3)
      .map((campaign, index) => {
        const matchingContract = contracts.find((entry) => entry.campaignId === campaign.id) ?? contracts[index] ?? null;
        return {
          id: campaign.id,
          brand: campaign.seller?.displayName ?? 'Seller workspace',
          category: this.readStringList(campaign.metadata, 'categories')[0] || 'Campaign',
          title: campaign.title,
          body: campaign.description || this.readString(campaign.metadata, 'summary') || 'Campaign performance details available in workspace.',
          actionLabel: 'View replay'
        };
      });
  }

  private buildLiveSlots(
    campaigns: Array<Prisma.CampaignGetPayload<{ include: { seller: true } }>>,
    workspace: Record<string, unknown>
  ) {
    const seed = Array.isArray(workspace.liveSlots) ? workspace.liveSlots : [];
    if (seed.length > 0) {
      return seed;
    }

    return [...campaigns]
      .slice(0, 3)
      .map((campaign, index) => ({
        id: campaign.id,
        label: index === 2 ? 'Replay' : campaign.startAt && new Date(campaign.startAt).getTime() > Date.now() ? 'Upcoming' : 'Replay',
        title: campaign.title,
        time: campaign.startAt ? this.formatCampaignSlot(campaign.startAt) : 'Schedule pending',
        cta: index === 2 ? 'Watch replay' : 'Set reminder'
      }));
  }

  private buildReviewCards(
    reviews: Array<Prisma.ReviewGetPayload<{}>>,
    campaigns: Array<Prisma.CampaignGetPayload<{ include: { seller: true } }>>
  ) {
    return reviews.slice(0, 3).map((review, index) => ({
      id: review.id,
      brand: review.buyerName || campaigns[index]?.seller?.displayName || `Seller ${index + 1}`,
      quote: review.reviewText || review.title || 'Strong execution and delivery.'
    }));
  }

  private buildPastCampaignCards(
    campaigns: Array<Prisma.CampaignGetPayload<{ include: { seller: true } }>>,
    contracts: Array<Prisma.ContractGetPayload<{ include: { seller: true } }>>
  ) {
    return [...campaigns]
      .slice(0, 4)
      .map((campaign, index) => {
        const contract = contracts.find((entry) => entry.campaignId === campaign.id) ?? contracts[index] ?? null;
        const gmv = Number(contract?.value || campaign.budget || 0);
        return {
          id: campaign.id,
          title: campaign.title,
          period: [campaign.startAt, campaign.endAt].filter(Boolean).map((value) => this.formatDateLabel(value as Date)).join(' - ') || 'Schedule pending',
          gmv: moneyLike(gmv),
          ctr: `${this.computeCtr(100000, gmv, 3).toFixed(1)}%`,
          conv: `${this.computeConversion(gmv, 100000).toFixed(1)}%`
        };
      });
  }

  private buildCompatibilityPayload(
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>,
    categories: string[],
    overlap: string[],
    fitScore: number,
    seller: { category: string | null; categories: string | null; region: string | null } | null
  ) {
    const sellerCategories = this.readSellerCategories(seller);
    const categorySummary = overlap.length
      ? `Strong fit for ${overlap.join(' and ')} campaigns in ${seller?.region || 'your active markets'}.`
      : `Audience and region fit are strongest around ${categories.slice(0, 2).join(' and ') || 'general commerce'} campaigns.`;

    return {
      score: fitScore,
      summary: categorySummary,
      bullets: [
        overlap.length > 0
          ? `Category overlap with seller portfolio: ${overlap.join(', ')}.`
          : `Creator expands beyond current seller categories: ${categories.join(', ') || 'General audience'}.`,
        `Verified ${profile.isKycVerified ? 'KYC and trust' : 'workspace'} status with ${this.formatCompactNumber(profile.followers)} followers.`,
        sellerCategories.length > 0
          ? `Seller focus areas considered: ${sellerCategories.join(', ')}.`
          : 'Fit score derived from creator performance and active contract history.'
      ]
    };
  }

  private buildQuickFacts(
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>,
    languages: string[],
    markets: string[],
    activeContracts: number
  ) {
    return [
      `Typical live duration: ${activeContracts > 2 ? '60-90 minutes' : '30-60 minutes'}.`,
      `Preferred collaboration language${languages.length === 1 ? '' : 's'}: ${languages.join(', ') || 'English'}.`,
      `Primary markets: ${markets.join(', ') || 'Global'}.`,
      `Tier: ${this.formatTier(profile.tier)} with ${this.formatCompactNumber(profile.followers)} total followers.`
    ];
  }

  private buildDeckContent(
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>,
    languages: string[],
    markets: string[],
    categories: string[],
    totalSales: number
  ) {
    return [
      'Creator Description Deck',
      '',
      `Name: ${profile.name}`,
      `Handle: @${profile.handle}`,
      `Tier: ${this.formatTier(profile.tier)}`,
      `Followers: ${this.formatCompactNumber(profile.followers)}`,
      `Categories: ${categories.join(', ') || 'General'}`,
      `Languages: ${languages.join(', ') || 'English'}`,
      `Markets: ${markets.join(', ') || 'Global'}`,
      `Attributed sales: ${moneyLike(totalSales)}`
    ].join('\n');
  }

  private normalizeCreatorWorkspacePayload(
    payload: Record<string, unknown>,
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>
  ) {
    const followers = Number(profile.followers || 0);
    return {
      about: this.readString(payload, 'about') || profile.bio || profile.tagline || '',
      tags: this.readStringList(payload, 'tags'),
      socials: this.normalizeCreatorSocials(payload, profile, followers),
      portfolio: Array.isArray(payload.portfolio) ? payload.portfolio : [],
      liveSlots: Array.isArray(payload.liveSlots) ? payload.liveSlots : []
    };
  }

  private normalizeCreatorSocials(
    payload: Record<string, unknown>,
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>,
    followers: number
  ) {
    const stored = Array.isArray(payload.socials) ? payload.socials.filter((entry) => entry && typeof entry === 'object') : [];
    if (stored.length > 0) {
      return stored;
    }

    const handle = `@${profile.handle}`;
    const values = [
      Math.round(followers * 0.38),
      Math.round(followers * 0.47),
      Math.max(0, followers - Math.round(followers * 0.38) - Math.round(followers * 0.47))
    ];

    return [
      { id: 'instagram', name: 'Instagram', handle, tag: 'IG', followers: this.formatCompactNumber(values[0]), color: 'bg-pink-500', href: null },
      { id: 'tiktok', name: 'TikTok', handle, tag: 'TT', followers: this.formatCompactNumber(values[1]), color: 'bg-black', href: null },
      { id: 'youtube', name: 'YouTube', handle, tag: 'YT', followers: this.formatCompactNumber(values[2]), color: 'bg-red-600', href: null }
    ];
  }

  private async ensureCreatorWorkspaceProfile(
    creatorUserId: string,
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>
  ) {
    const key = 'creator_public_profile';
    const existing = await this.loadSetting(creatorUserId, key);
    if (existing) {
      return existing;
    }

    const defaultPayload = sanitizePayload(
      {
        about: profile.bio || profile.tagline || '',
        tags: this.readStringList(profile.categories),
        socials: this.normalizeCreatorSocials({}, profile, Number(profile.followers || 0)),
        portfolio: [],
        liveSlots: []
      },
      { maxDepth: 8, maxArrayLength: 100, maxKeys: 100 }
    ) as Record<string, unknown>;

    await this.upsertSetting(creatorUserId, key, defaultPayload);
    return defaultPayload;
  }

  private async ensureDeliverablePacks(userId: string) {
    const key = 'seller_creator_deliverable_packs';
    const existing = await this.loadSetting(userId, key);
    const stored = Array.isArray(existing?.packs) ? existing.packs : [];
    if (stored.length > 0) {
      return stored as Array<Record<string, unknown>>;
    }

    const defaultPayload = sanitizePayload(
      {
        packs: [
          {
            id: 'pack-live',
            name: 'Live session package',
            deliverables: ['1 hosted live session', 'Pinned CTA block', 'Replay clip'],
            fee: 400,
            commissionPct: 5,
            paymentSplit: '50/50',
            exclusivityDays: 7,
            usageRightsDays: 90
          },
          {
            id: 'pack-hybrid',
            name: 'Hybrid launch package',
            deliverables: ['1 live session', '2 short clips', '1 story sequence'],
            fee: 650,
            commissionPct: 6,
            paymentSplit: '50/50',
            exclusivityDays: 14,
            usageRightsDays: 120
          },
          {
            id: 'pack-story',
            name: 'Story burst package',
            deliverables: ['3 story frames', '1 CTA swipe link', '1 reminder post'],
            fee: 250,
            commissionPct: 4,
            paymentSplit: '50/50',
            exclusivityDays: 3,
            usageRightsDays: 30
          }
        ]
      },
      { maxDepth: 8, maxArrayLength: 100, maxKeys: 100 }
    ) as Record<string, unknown>;

    await this.upsertSetting(userId, key, defaultPayload);
    return (defaultPayload.packs as Array<Record<string, unknown>>) ?? [];
  }

  private computeCategoryOverlap(
    seller: { category: string | null; categories: string | null; region: string | null } | null,
    creatorCategories: string[]
  ) {
    const sellerCategories = this.readSellerCategories(seller).map((entry) => entry.toLowerCase());
    const creator = creatorCategories.map((entry) => entry.toLowerCase());
    return creatorCategories.filter((entry, index) => sellerCategories.includes(creator[index]));
  }

  private computeFitScore(
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>,
    overlap: string[],
    activeContracts: number,
    reviews: Array<Prisma.ReviewGetPayload<{}>>
  ) {
    const rating = this.resolveRating(profile.rating, reviews);
    const followersScore = Math.min(16, Math.round(Number(profile.followers || 0) / 15000));
    const overlapScore = overlap.length * 10;
    const contractScore = Math.min(10, activeContracts * 3);
    const verifiedScore = profile.isKycVerified ? 6 : 0;
    return Math.max(55, Math.min(98, Math.round(50 + overlapScore + followersScore + contractScore + rating * 4 + verifiedScore)));
  }

  private computeCtr(followers: number, totalSales: number, reviewsCount: number) {
    const reachFactor = followers > 0 ? totalSales / Math.max(1, followers) : 0;
    return Number((Math.min(8.4, 1.8 + reachFactor * 100 + reviewsCount * 0.1)).toFixed(1));
  }

  private computeConversion(totalSales: number, followers: number) {
    if (!followers) {
      return 0;
    }
    return Number((Math.min(9.8, Math.max(0.8, (totalSales / Math.max(1, followers)) * 12))).toFixed(1));
  }

  private resolveRating(stored: number, reviews: Array<Prisma.ReviewGetPayload<{}>>) {
    if (reviews.length > 0) {
      const total = reviews.reduce((sum, review) => sum + Number(review.ratingOverall || 0), 0);
      return Number((total / reviews.length).toFixed(1));
    }
    return Number(Number(stored || 0).toFixed(1));
  }

  private buildCreatorPlatforms(profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>) {
    const primary = this.readStringList(profile.languages)[0] === 'French' ? 'Instagram' : 'TikTok';
    const secondary = Number(profile.followers || 0) > 100000 ? 'YouTube' : 'Instagram';
    return [primary, secondary, 'WhatsApp']
      .filter((value, index, list) => list.indexOf(value) === index)
      .map((platform) => ({ platform }));
  }

  private buildCreatorBadge(
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>,
    rating: number
  ) {
    if (profile.tier === 'GOLD' || rating >= 4.8) {
      return 'Top Creator';
    }
    if (profile.isKycVerified || rating >= 4.5) {
      return 'High Trust';
    }
    return 'Rising';
  }

  private buildTrustBadges(
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>,
    rating: number,
    activeContracts: number
  ) {
    const badges = [];
    if (profile.isKycVerified) {
      badges.push('Verified');
    }
    if (rating >= 4.5) {
      badges.push('Top rated');
    }
    if (activeContracts > 0) {
      badges.push('Active delivery');
    }
    return badges;
  }

  private buildRelationshipLabel(activeContracts: number, completedContracts: number, invites: number) {
    if (activeContracts > 0) {
      return `${activeContracts} active campaign${activeContracts === 1 ? '' : 's'}`;
    }
    if (completedContracts > 0) {
      return `${completedContracts} past campaign${completedContracts === 1 ? '' : 's'}`;
    }
    if (invites > 0) {
      return `${invites} invite${invites === 1 ? '' : 's'} sent`;
    }
    return 'New';
  }

  private buildFitReason(
    categories: string[],
    overlap: string[],
    profile: Prisma.CreatorProfileGetPayload<{ include: { user: true } }>,
    activeContracts: number
  ) {
    if (overlap.length > 0) {
      return `Strong ${overlap.join(' + ')} overlap with seller demand and ${this.formatCompactNumber(profile.followers)} followers.`;
    }
    if (activeContracts > 0) {
      return `Already collaborating successfully with ${activeContracts} active contract${activeContracts === 1 ? '' : 's'}.`;
    }
    return `Useful for ${categories.slice(0, 2).join(' and ') || 'general'} discovery campaigns with trusted audience reach.`;
  }

  private buildCreatorTagline(categories: string[]) {
    if (!categories.length) {
      return 'Creator focused on live commerce and product storytelling.';
    }
    return `${categories.join(', ')} content creator focused on live commerce and product storytelling.`;
  }

  private resolveRecentActivityAt(
    updatedAt: Date,
    campaigns: Array<{ updatedAt: Date; startAt: Date | null }>,
    contracts: Array<{ updatedAt: Date }>,
    invites: Array<{ updatedAt: Date }>
  ) {
    return [updatedAt, ...campaigns.map((entry) => entry.startAt || entry.updatedAt), ...contracts.map((entry) => entry.updatedAt), ...invites.map((entry) => entry.updatedAt)]
      .filter(Boolean)
      .sort((left, right) => right.getTime() - left.getTime())[0];
  }

  private formatRelativeWorkspaceActivity(value?: Date | null) {
    if (!value) {
      return 'Recently active';
    }
    const diffDays = Math.floor((Date.now() - value.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 2) {
      return 'Active this week';
    }
    if (diffDays <= 10) {
      return 'Live this month';
    }
    return 'Recently active';
  }

  private estimateLiveViewers(followers: number) {
    return Math.max(250, Math.round(followers * 0.025));
  }

  private formatCampaignSlot(value: Date) {
    const date = new Date(value);
    return `${date.toLocaleDateString(undefined, { weekday: 'short' })} · ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  }

  private formatCampaignStatus(value: unknown) {
    const normalized = String(value || '').toLowerCase();
    if (!normalized) {
      return 'Draft';
    }
    return normalized
      .split('_')
      .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
      .join(' ');
  }

  private formatTier(value: unknown) {
    const normalized = String(value || '').toLowerCase();
    if (!normalized) {
      return 'Bronze';
    }
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private formatCompactNumber(value: number) {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(Number(value || 0));
  }

  private formatDateLabel(value: Date) {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  private readSellerCategories(seller: { category: string | null; categories: string | null; region: string | null } | null) {
    return Array.from(
      new Set([
        ...this.readStringList(seller?.categories),
        ...(seller?.category ? [seller.category] : [])
      ].filter(Boolean))
    );
  }

  private readStringList(value: unknown, key?: string) {
    const source = key && value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : value;

    if (Array.isArray(source)) {
      return source.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if (typeof source === 'string') {
      return source
        .split(/[,\n|]/g)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
  }

  private readString(value: unknown, key?: string) {
    const source = key && value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : value;
    return typeof source === 'string' && source.trim() ? source.trim() : '';
  }

  private async loadSetting(userId: string, key: string) {
    const setting = await this.prisma.workspaceSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key
        }
      }
    });

    return (setting?.payload as Record<string, unknown> | null) ?? null;
  }

  private async upsertSetting(userId: string, key: string, payload: Record<string, unknown>) {
    await this.prisma.workspaceSetting.upsert({
      where: {
        userId_key: {
          userId,
          key
        }
      },
      create: {
        userId,
        key,
        payload: payload as Prisma.InputJsonValue
      },
      update: {
        payload: payload as Prisma.InputJsonValue
      }
    });
  }

  private async ensureProposalForInvite(
    invite: {
      id: string;
      sellerId: string | null;
      campaignId: string | null;
      title: string;
      message: string | null;
      metadata: unknown;
    },
    metadata: Record<string, unknown>,
    creatorUserId: string
  ) {
    const existingId = typeof metadata.proposalId === 'string' ? metadata.proposalId : null;
    if (existingId) {
      const existing = await this.prisma.proposal.findUnique({ where: { id: existingId } });
      if (existing) {
        return existing;
      }
    }

    if (!invite.sellerId) {
      throw new BadRequestException('Invite is missing the seller relationship needed for a proposal');
    }

    const amount =
      typeof metadata.estimatedValue === 'number'
        ? metadata.estimatedValue
        : typeof metadata.baseFee === 'number'
          ? metadata.baseFee
          : null;
    const proposalMetadata = sanitizePayload(
      {
        inviteId: invite.id,
        proposalIdLabel: `P-${invite.id.slice(-6).toUpperCase()}`,
        supplierName: metadata.sellerName || null,
        sellerInitials: metadata.sellerInitials || null,
        campaignTitle: metadata.campaignTitle || invite.title,
        region: metadata.region || 'Global',
        category: metadata.category || 'General',
        fitReason: metadata.fitReason || null,
        liveWindow: metadata.liveWindow || 'To be agreed',
        deliverablesList: Array.isArray(metadata.deliverablesList) ? metadata.deliverablesList : [],
        terms: {
          deliverables: String(metadata.messageShort || invite.message || 'Deliverables to be confirmed in negotiation.'),
          schedule: 'Schedule to be agreed between seller and creator.',
          compensation:
            amount != null
              ? `${metadata.currency || 'USD'} ${Number(amount).toLocaleString()} starting budget. Final terms to be agreed in negotiation.`
              : 'Compensation to be agreed in negotiation.'
        }
      },
      { maxDepth: 8, maxArrayLength: 250, maxKeys: 250 }
    ) as Prisma.InputJsonValue;

    const proposal = await this.prisma.proposal.create({
      data: {
        campaignId: invite.campaignId ?? undefined,
        sellerId: invite.sellerId,
        creatorId: creatorUserId,
        submittedByUserId: creatorUserId,
        title: String(metadata.campaignTitle || invite.title),
        summary: invite.message || String(metadata.messageShort || 'Invite accepted. Negotiation opened.'),
        amount,
        currency: typeof metadata.currency === 'string' ? metadata.currency : 'USD',
        status: 'SUBMITTED',
        metadata: proposalMetadata
      }
    });

    await this.prisma.proposalMessage.create({
      data: {
        proposalId: proposal.id,
        authorUserId: creatorUserId,
        body: `Invite accepted. Opening negotiation for ${String(metadata.campaignTitle || invite.title)}.`,
        messageType: 'SYSTEM'
      }
    });

    return proposal;
  }

  private serializeInvite(invite: {
    id: string;
    title: string;
    message: string | null;
    status: string;
    seller?: { displayName: string | null; rating?: number | null } | null;
    sender?: {
      email: string;
      creatorProfile?: { name?: string | null } | null;
      sellerProfile?: { displayName?: string | null } | null;
    };
    opportunityId?: string | null;
    campaignId?: string | null;
    metadata?: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const metadata = this.normalizeInviteMetadata(invite.metadata);
    return {
      id: invite.id,
      title: invite.title,
      message: invite.message,
      status: invite.status,
      seller: invite.seller?.displayName ?? (metadata.sellerName ? String(metadata.sellerName) : null),
      sellerInitials: String(metadata.sellerInitials || this.buildInitials(String(metadata.sellerName || invite.seller?.displayName || 'SP'), 'SP')),
      campaign: String(metadata.campaignTitle || invite.title || 'Campaign'),
      type: typeof metadata.type === 'string' ? metadata.type : 'Live collaboration',
      category: typeof metadata.category === 'string' ? metadata.category : 'General',
      region: typeof metadata.region === 'string' ? metadata.region : 'Global',
      baseFee: typeof metadata.baseFee === 'number' ? metadata.baseFee : 0,
      currency: typeof metadata.currency === 'string' ? metadata.currency : 'USD',
      commissionPct: typeof metadata.commissionPct === 'number' ? metadata.commissionPct : 0,
      estimatedValue: typeof metadata.estimatedValue === 'number' ? metadata.estimatedValue : 0,
      fitScore: typeof metadata.fitScore === 'number' ? metadata.fitScore : 70,
      fitReason:
        typeof metadata.fitReason === 'string' ? metadata.fitReason : 'Matched by campaign preferences.',
      messageShort:
        typeof metadata.messageShort === 'string' ? metadata.messageShort : invite.message ?? 'New invite from seller.',
      lastActivity: this.describeInviteActivity(invite.status, invite.updatedAt),
      supplierDescription:
        typeof metadata.supplierDescription === 'string'
          ? metadata.supplierDescription
          : 'Supplier invite from MyLiveDealz.',
      supplierRating:
        typeof metadata.supplierRating === 'number'
          ? metadata.supplierRating
          : Number(invite.seller?.rating ?? 0),
      sender:
        invite.sender?.creatorProfile?.name ??
        invite.sender?.sellerProfile?.displayName ??
        invite.sender?.email ??
        null,
      opportunityId: invite.opportunityId,
      campaignId: invite.campaignId,
      proposalId: typeof metadata.proposalId === 'string' ? metadata.proposalId : null,
      metadata,
      createdAt: invite.createdAt,
      updatedAt: invite.updatedAt
    };
  }

  private describeInviteActivity(status: string, updatedAt: Date) {
    const label = String(status || '').toLowerCase();
    if (label === 'accepted') return 'Accepted · Recently';
    if (label === 'declined') return 'Declined · Recently';
    if (label === 'expired') return 'Expired · Recently';
    return `Updated · ${updatedAt.toISOString()}`;
  }

  private buildInitials(value: string, defaultValue: string) {
    const initials = String(value || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((entry) => entry[0]?.toUpperCase() || '')
      .join('');
    return initials || String(defaultValue || '').replace(/^@/, '').slice(0, 2).toUpperCase() || 'CR';
  }
}
