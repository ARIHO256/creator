import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CampaignStatus, Prisma } from '@prisma/client';
import { normalizeFileIntake } from '../../common/files/file-intake.js';
import { sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CreateAssetDto } from './dto/create-asset.dto.js';
import { CreateProposalMessageDto } from './dto/create-proposal-message.dto.js';
import { CreateProposalDto } from './dto/create-proposal.dto.js';
import { CreateTaskAttachmentDto } from './dto/create-task-attachment.dto.js';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { ReviewAssetDto } from './dto/review-asset.dto.js';
import { TransitionProposalDto } from './dto/transition-proposal.dto.js';
import { UpdateProposalDto } from './dto/update-proposal.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';

@Injectable()
export class CollaborationService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async campaigns(userId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: this.workspaceAccessClause(userId),
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

    return campaigns.map((campaign: any) => ({
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      status: campaign.status,
      budget: campaign.budget,
      currency: campaign.currency,
      seller: campaign.seller.displayName,
      creator: campaign.creator?.creatorProfile?.name ?? null,
      metadata: campaign.metadata,
      startAt: campaign.startAt,
      endAt: campaign.endAt,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt
    }));
  }

  async campaign(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, ...this.workspaceAccessClause(userId) },
      include: {
        seller: true,
        creator: {
          include: {
            creatorProfile: true
          }
        }
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return this.serializeWorkspaceCampaign(campaign);
  }

  async campaignWorkspace(userId: string) {
    const [campaigns, catalog] = await Promise.all([
      this.prisma.campaign.findMany({
        where: this.workspaceAccessClause(userId),
        include: {
          seller: true,
          creator: {
            include: {
              creatorProfile: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.workspaceSetting.findUnique({
        where: {
          userId_key: {
            userId,
            key: 'seller_campaign_catalog'
          }
        }
      })
    ]);

    return {
      campaigns: campaigns.map((campaign: any) => this.serializeWorkspaceCampaign(campaign)),
      catalogItems: this.extractCatalogItems(catalog?.payload)
    };
  }

  async dealzMarketplace(userId: string) {
    const payload = await this.readDealzMarketplace(userId, 'seller_dealz_marketplace') as Record<string, unknown>;
    const [suppliers, creators, campaigns] = await Promise.all([
      this.loadDealzMarketplaceSuppliers(userId),
      this.loadDealzMarketplaceCreators(),
      this.loadDealzMarketplaceCampaigns(userId)
    ]);

    return {
      ...payload,
      deals: this.mergeMarketplaceDeals(payload.deals, campaigns),
      suppliers: this.mergeMarketplaceActors(payload.suppliers, suppliers, 'name'),
      creators: this.mergeMarketplaceActors(payload.creators, creators, 'handle')
    };
  }

  async updateDealzMarketplace(userId: string, payload: Record<string, unknown>) {
    const current = await this.dealzMarketplace(userId);
    const next = this.sanitizeLegacyMarketplacePayload({
      ...current,
      ...payload
    });

    await this.prisma.workspaceSetting.upsert({
      where: {
        userId_key: {
          userId,
          key: 'seller_dealz_marketplace'
        }
      },
      update: {
        payload: next as Prisma.InputJsonValue
      },
      create: {
        userId,
        key: 'seller_dealz_marketplace',
        payload: next as Prisma.InputJsonValue
      }
    });

    return next;
  }

  async legacyMarketplace(userId: string) {
    return this.readDealzMarketplace(userId, 'seller_dealz_marketplace_legacy');
  }

  async updateLegacyMarketplace(userId: string, payload: Record<string, unknown>) {
    const current = await this.legacyMarketplace(userId);
    const next = this.sanitizeLegacyMarketplacePayload({
      ...current,
      ...payload
    });

    await this.prisma.workspaceSetting.upsert({
      where: {
        userId_key: {
          userId,
          key: 'seller_dealz_marketplace_legacy'
        }
      },
      update: {
        payload: next as Prisma.InputJsonValue
      },
      create: {
        userId,
        key: 'seller_dealz_marketplace_legacy',
        payload: next as Prisma.InputJsonValue
      }
    });

    return next;
  }

  private async readDealzMarketplace(userId: string, key: string) {
    const primary = await this.prisma.workspaceSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key
        }
      }
    });
    if (primary?.payload && typeof primary.payload === 'object' && !Array.isArray(primary.payload)) {
      return primary.payload as Record<string, unknown>;
    }

    if (key === 'seller_dealz_marketplace') {
      const legacy = await this.prisma.workspaceSetting.findUnique({
        where: {
          userId_key: {
            userId,
            key: 'seller_dealz_marketplace_legacy'
          }
        }
      });
      if (legacy?.payload && typeof legacy.payload === 'object' && !Array.isArray(legacy.payload)) {
        const migrated = this.sanitizeLegacyMarketplacePayload(legacy.payload as Record<string, unknown>);
        await this.prisma.workspaceSetting.upsert({
          where: {
            userId_key: {
              userId,
              key
            }
          },
          update: {
            payload: migrated as Prisma.InputJsonValue
          },
          create: {
            userId,
            key,
            payload: migrated as Prisma.InputJsonValue
          }
        });
        return migrated;
      }
    }

    const emptyState = { deals: [], selectedId: '', cart: {}, liveCart: {} };
    const created = await this.prisma.workspaceSetting.upsert({
      where: {
        userId_key: {
          userId,
          key
        }
      },
      update: {
        payload: emptyState as Prisma.InputJsonValue
      },
      create: {
        userId,
        key,
        payload: emptyState as Prisma.InputJsonValue
      }
    });

    return (created.payload as Record<string, unknown>) ?? emptyState;
  }

  async createCampaign(userId: string, payload: Record<string, unknown>) {
    const actor = await this.loadActor(userId);
    if (!actor.sellerProfile) {
      throw new ForbiddenException('Seller campaign creation is only available to seller workspaces');
    }

    const metadata = this.normalizeCampaignMetadata(payload.metadata);
    const title = this.resolveCampaignTitle(payload, metadata);
    const status = this.normalizeCampaignStatus(payload.status, metadata);
    const campaign = await this.prisma.campaign.create({
      data: {
        id: typeof payload.id === 'string' && payload.id.trim() ? payload.id.trim() : randomUUID(),
        sellerId: actor.sellerProfile.id,
        creatorId: typeof payload.creatorId === 'string' && payload.creatorId.trim() ? payload.creatorId.trim() : null,
        createdByUserId: userId,
        title,
        description: typeof payload.description === 'string' ? payload.description : null,
        status,
        budget: this.resolveCampaignBudget(payload, metadata),
        currency: this.resolveCampaignCurrency(payload, metadata),
        metadata: metadata as Prisma.InputJsonValue,
        startAt: this.resolveCampaignStart(payload, metadata),
        endAt: this.resolveCampaignEnd(payload, metadata)
      },
      include: {
        seller: true,
        creator: {
          include: {
            creatorProfile: true
          }
        }
      }
    });

    await this.syncCampaignGiveaways(campaign.id, metadata);
    return this.serializeWorkspaceCampaign(campaign);
  }

  async updateCampaign(userId: string, id: string, payload: Record<string, unknown>) {
    const existing = await this.ensureCampaignAccess(userId, id);
    const currentMetadata = this.normalizeCampaignMetadata(existing.metadata);
    const nextMetadata = payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
      ? this.deepMerge(currentMetadata, this.normalizeCampaignMetadata(payload.metadata))
      : currentMetadata;

    const updated = await this.prisma.campaign.update({
      where: { id: existing.id },
      data: {
        title: this.resolveCampaignTitle(payload, nextMetadata, existing.title),
        description: typeof payload.description === 'string' ? payload.description : existing.description,
        status: this.normalizeCampaignStatus(payload.status, nextMetadata, existing.status),
        budget: this.resolveCampaignBudget(payload, nextMetadata, existing.budget),
        currency: this.resolveCampaignCurrency(payload, nextMetadata, existing.currency),
        metadata: nextMetadata as Prisma.InputJsonValue,
        startAt: this.resolveCampaignStart(payload, nextMetadata, existing.startAt),
        endAt: this.resolveCampaignEnd(payload, nextMetadata, existing.endAt)
      },
      include: {
        seller: true,
        creator: {
          include: {
            creatorProfile: true
          }
        }
      }
    });

    await this.syncCampaignGiveaways(updated.id, nextMetadata);
    return this.serializeWorkspaceCampaign(updated);
  }

  async proposals(userId: string) {
    const proposals = await this.prisma.proposal.findMany({
      where: this.proposalAccessClause(userId),
      include: {
        seller: true,
        creator: {
          include: {
            creatorProfile: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return proposals.map((proposal: any) => this.serializeProposal(proposal));
  }

  async createProposal(userId: string, payload: CreateProposalDto) {
    const actor = await this.loadActor(userId);
    const campaign = payload.campaignId
      ? await this.ensureCampaignAccess(userId, payload.campaignId)
      : null;

    const sellerId = payload.sellerId || campaign?.sellerId || actor.sellerProfile?.id;
    const creatorId = payload.creatorId || campaign?.creatorId || (actor.creatorProfile ? actor.id : undefined);

    if (!sellerId || !creatorId) {
      throw new BadRequestException('Proposal requires both sellerId and creatorId');
    }

    const privileged = ['ADMIN', 'SUPPORT'].includes(actor.role ?? '');
    if (!privileged && actor.sellerProfile && sellerId !== actor.sellerProfile.id) {
      throw new ForbiddenException('Cannot submit proposal for another seller');
    }
    if (!privileged && actor.creatorProfile && creatorId !== actor.id) {
      throw new ForbiddenException('Cannot submit proposal for another creator');
    }

    return this.prisma.proposal.create({
      data: {
        campaignId: payload.campaignId,
        sellerId,
        creatorId,
        submittedByUserId: userId,
        title: payload.title,
        summary: payload.summary,
        amount: payload.amount,
        currency: payload.currency ?? 'USD',
        status: payload.status ?? 'SUBMITTED',
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      },
      include: {
        seller: true,
        creator: {
          include: {
            creatorProfile: true
          }
        },
        messages: true
      }
    });
  }

  async proposal(userId: string, id: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, ...this.proposalAccessClause(userId) },
      include: {
        seller: true,
        creator: {
          include: {
            creatorProfile: true
          }
        },
        messages: {
          include: {
            author: {
              include: {
                creatorProfile: true,
                sellerProfile: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    return this.serializeProposal(proposal);
  }

  async updateProposal(userId: string, id: string, payload: UpdateProposalDto) {
    const proposal = await this.ensureProposal(userId, id);
    return this.prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        ...payload,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async proposalMessage(userId: string, id: string, payload: CreateProposalMessageDto) {
    const proposal = await this.ensureProposal(userId, id);
    return this.prisma.proposalMessage.create({
      data: {
        proposalId: proposal.id,
        authorUserId: userId,
        body: payload.body,
        messageType: payload.messageType ?? 'COMMENT'
      }
    });
  }

  async proposalTransition(userId: string, id: string, payload: TransitionProposalDto) {
    const proposal = await this.ensureProposal(userId, id);
    return this.prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: payload.status }
    });
  }

  async contracts(userId: string) {
    const contracts = await this.prisma.contract.findMany({
      where: this.contractAccessClause(userId),
      include: {
        seller: true,
        creator: {
          include: {
            creatorProfile: true
          }
        },
        campaign: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    return contracts.map((contract: any) => this.serializeContract(contract));
  }

  async contract(userId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, ...this.contractAccessClause(userId) },
      include: {
        seller: true,
        creator: {
          include: {
            creatorProfile: true
          }
        },
        tasks: true,
        assets: true
      }
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return this.serializeContract(contract);
  }

  async terminateContract(userId: string, id: string, payload: { reason?: string }) {
    const contract = await this.ensureContract(userId, id);
    return this.prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: 'TERMINATION_REQUESTED',
        terminationRequestedAt: new Date(),
        terminationReason: payload.reason ?? null
      }
    });
  }

  async tasks(userId: string) {
    const tasks = await this.prisma.task.findMany({
      where: this.taskAccessClause(userId),
      include: {
        campaign: {
          include: {
            seller: true,
            creator: {
              include: {
                creatorProfile: true
              }
            }
          }
        },
        contract: {
          include: {
            seller: true,
            creator: {
              include: {
                creatorProfile: true
              }
            },
            campaign: true
          }
        },
        createdBy: {
          include: {
            creatorProfile: true,
            sellerProfile: true
          }
        },
        assignee: {
          include: {
            creatorProfile: true,
            sellerProfile: true
          }
        },
        comments: {
          include: {
            author: {
              include: {
                creatorProfile: true,
                sellerProfile: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: {
          include: {
            addedBy: {
              include: {
                creatorProfile: true,
                sellerProfile: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return tasks.map((task: any) => this.serializeTask(task));
  }

  async task(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, ...this.taskAccessClause(userId) },
      include: {
        campaign: {
          include: {
            seller: true,
            creator: {
              include: {
                creatorProfile: true
              }
            }
          }
        },
        contract: {
          include: {
            seller: true,
            creator: {
              include: {
                creatorProfile: true
              }
            },
            campaign: true
          }
        },
        createdBy: {
          include: {
            creatorProfile: true,
            sellerProfile: true
          }
        },
        assignee: {
          include: {
            creatorProfile: true,
            sellerProfile: true
          }
        },
        comments: {
          include: {
            author: {
              include: {
                creatorProfile: true,
                sellerProfile: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: {
          include: {
            addedBy: {
              include: {
                creatorProfile: true,
                sellerProfile: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.serializeTask(task);
  }

  async createTask(userId: string, payload: CreateTaskDto) {
    await this.assertTaskScope(userId, payload);
    return this.prisma.task.create({
      data: {
        campaignId: payload.campaignId,
        contractId: payload.contractId,
        createdByUserId: userId,
        assigneeUserId: payload.assigneeUserId,
        title: payload.title,
        description: payload.description,
        status: payload.status ?? 'TODO',
        priority: payload.priority ?? 'MEDIUM',
        dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateTask(userId: string, id: string, payload: UpdateTaskDto) {
    const task = await this.ensureTask(userId, id);
    return this.prisma.task.update({
      where: { id: task.id },
      data: {
        ...payload,
        dueAt: payload.dueAt ? new Date(payload.dueAt) : undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async taskComment(userId: string, id: string, payload: CreateTaskCommentDto) {
    const task = await this.ensureTask(userId, id);
    return this.prisma.taskComment.create({
      data: {
        taskId: task.id,
        authorUserId: userId,
        body: payload.body
      }
    });
  }

  async taskAttachment(userId: string, id: string, payload: CreateTaskAttachmentDto) {
    const task = await this.ensureTask(userId, id);
    const file = normalizeFileIntake(payload);
    return this.prisma.taskAttachment.create({
      data: {
        taskId: task.id,
        addedByUserId: userId,
        name: file.name,
        kind: file.kind,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        checksum: file.checksum,
        storageProvider: file.storageProvider,
        storageKey: file.storageKey,
        url: file.url,
        metadata: {
          extension: file.extension,
          visibility: file.visibility,
          ...(file.metadata ?? {})
        } as Prisma.InputJsonValue
      }
    });
  }

  async assets(userId: string) {
    const assets = await this.prisma.deliverableAsset.findMany({
      where: this.assetAccessClause(userId),
      orderBy: { updatedAt: 'desc' }
    });

    return assets;
  }

  async asset(userId: string, id: string) {
    const asset = await this.prisma.deliverableAsset.findFirst({
      where: { id, ...this.assetAccessClause(userId) }
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  async createAsset(userId: string, payload: CreateAssetDto) {
    await this.assertAssetScope(userId, payload);
    const file = normalizeFileIntake({
      name: payload.title,
      ...payload,
      kind: payload.assetType
    });

    return this.prisma.deliverableAsset.create({
      data: {
        campaignId: payload.campaignId,
        contractId: payload.contractId,
        ownerUserId: userId,
        title: payload.title,
        assetType: file.kind,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        extension: file.extension,
        checksum: file.checksum,
        storageProvider: file.storageProvider,
        storageKey: file.storageKey,
        url: file.url,
        status: 'SUBMITTED',
        metadata: {
          visibility: file.visibility,
          ...(file.metadata ?? {})
        } as Prisma.InputJsonValue
      }
    });
  }

  async reviewAsset(userId: string, id: string, payload: ReviewAssetDto) {
    const asset = await this.ensureAsset(userId, id);
    return this.prisma.deliverableAsset.update({
      where: { id: asset.id },
      data: {
        reviewerUserId: userId,
        reviewNotes: payload.reviewNotes,
        status: payload.status ?? 'IN_REVIEW'
      }
    });
  }

  private workspaceAccessClause(userId: string) {
    return {
      OR: [{ creatorId: userId }, { createdByUserId: userId }, { seller: { userId } }]
    } satisfies Prisma.CampaignWhereInput;
  }

  private proposalAccessClause(userId: string) {
    return {
      OR: [{ creatorId: userId }, { submittedByUserId: userId }, { seller: { userId } }]
    } satisfies Prisma.ProposalWhereInput;
  }

  private contractAccessClause(userId: string) {
    return {
      OR: [{ creatorId: userId }, { seller: { userId } }]
    } satisfies Prisma.ContractWhereInput;
  }

  private taskAccessClause(userId: string) {
    return {
      OR: [
        { createdByUserId: userId },
        { assigneeUserId: userId },
        { campaign: { creatorId: userId } },
        { campaign: { seller: { userId } } },
        { contract: { creatorId: userId } },
        { contract: { seller: { userId } } }
      ]
    } satisfies Prisma.TaskWhereInput;
  }

  private assetAccessClause(userId: string) {
    return {
      OR: [
        { ownerUserId: userId },
        { reviewerUserId: userId },
        { campaign: { creatorId: userId } },
        { campaign: { seller: { userId } } },
        { contract: { creatorId: userId } },
        { contract: { seller: { userId } } }
      ]
    } satisfies Prisma.DeliverableAssetWhereInput;
  }

  private async ensureProposal(userId: string, id: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, ...this.proposalAccessClause(userId) }
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    return proposal;
  }

  private async ensureContract(userId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, ...this.contractAccessClause(userId) }
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  private async ensureTask(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, ...this.taskAccessClause(userId) }
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private async ensureAsset(userId: string, id: string) {
    const asset = await this.prisma.deliverableAsset.findFirst({
      where: { id, ...this.assetAccessClause(userId) }
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  private async ensureCampaignAccess(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, ...this.workspaceAccessClause(userId) }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  private async ensureContractAccess(userId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, ...this.contractAccessClause(userId) }
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  private async assertTaskScope(userId: string, payload: CreateTaskDto) {
    if (payload.campaignId) {
      await this.ensureCampaignAccess(userId, payload.campaignId);
    }
    if (payload.contractId) {
      await this.ensureContractAccess(userId, payload.contractId);
    }
  }

  private async assertAssetScope(userId: string, payload: CreateAssetDto) {
    if (payload.campaignId) {
      await this.ensureCampaignAccess(userId, payload.campaignId);
    }
    if (payload.contractId) {
      await this.ensureContractAccess(userId, payload.contractId);
    }
  }

  private async loadActor(userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        creatorProfile: true,
        sellerProfile: true
      }
    });

    if (!actor) {
      throw new NotFoundException('User not found');
    }

    return actor;
  }

  private serializeProposal(proposal: any) {
    return {
      id: proposal.id,
      title: proposal.title,
      summary: proposal.summary,
      amount: proposal.amount,
      currency: proposal.currency,
      status: proposal.status,
      metadata: proposal.metadata,
      seller: proposal.seller.displayName,
      creator: proposal.creator.creatorProfile?.name ?? proposal.creator.email,
      messages: proposal.messages.map((message) => ({
        ...message,
        author:
          message.author?.creatorProfile?.name ??
          message.author?.sellerProfile?.displayName ??
          message.author?.email ??
          null
      })),
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt
    };
  }

  private serializeWorkspaceCampaign(campaign: any) {
    const metadata = this.normalizeCampaignMetadata(campaign.metadata);
    return {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      status: campaign.status,
      budget: campaign.budget,
      currency: campaign.currency,
      seller: campaign.seller?.displayName ?? null,
      creator: campaign.creator?.creatorProfile?.name ?? campaign.creator?.email ?? null,
      startAt: campaign.startAt?.toISOString?.() ?? campaign.startAt ?? null,
      endAt: campaign.endAt?.toISOString?.() ?? campaign.endAt ?? null,
      createdAt: campaign.createdAt?.toISOString?.() ?? campaign.createdAt ?? null,
      updatedAt: campaign.updatedAt?.toISOString?.() ?? campaign.updatedAt ?? null,
      metadata,
      ...metadata
    };
  }

  private extractCatalogItems(payload: unknown) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return [];
    }
    const items = (payload as Record<string, unknown>).catalogItems;
    return Array.isArray(items) ? items : [];
  }

  private normalizeCampaignMetadata(value: unknown) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? sanitizePayload(value, { maxDepth: 8, maxArrayLength: 250, maxKeys: 250 }) as Record<string, unknown>
      : {};
  }

  private sanitizeLegacyMarketplacePayload(value: Record<string, unknown>) {
    const safe = sanitizePayload(value, {
      maxDepth: 8,
      maxArrayLength: 500,
      maxKeys: 500,
      normalizeUrlFields: false,
      throwOnInvalidUrl: false
    }) as Record<string, unknown>;

    return {
      deals: Array.isArray(safe.deals) ? safe.deals : [],
      selectedId: typeof safe.selectedId === 'string' ? safe.selectedId : '',
      cart: safe.cart && typeof safe.cart === 'object' && !Array.isArray(safe.cart) ? safe.cart : {},
      liveCart: safe.liveCart && typeof safe.liveCart === 'object' && !Array.isArray(safe.liveCart) ? safe.liveCart : {},
      suppliers: Array.isArray(safe.suppliers) ? safe.suppliers : [],
      creators: Array.isArray(safe.creators) ? safe.creators : [],
      templates: safe.templates && typeof safe.templates === 'object' && !Array.isArray(safe.templates) ? safe.templates : {}
    };
  }

  private async loadDealzMarketplaceSuppliers(userId: string) {
    const sellers = await this.prisma.seller.findMany({
      take: 24,
      include: { storefront: true },
      orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }, { updatedAt: 'desc' }]
    });

    if (!sellers.length) {
      return [];
    }

    const mapped = sellers.map((seller) => ({
      id: seller.id,
      name: seller.displayName || seller.storefrontName || seller.name,
      category: seller.category || 'Seller',
      logoUrl: seller.storefront?.logoUrl || seller.storefront?.coverUrl || ''
    }));

    const currentSellerId = sellers.find((seller) => seller.userId === userId)?.id;
    const currentSeller = currentSellerId ? mapped.find((seller) => seller.id === currentSellerId) : null;
    if (!currentSeller) {
      return mapped;
    }

    return [currentSeller, ...mapped.filter((seller) => seller.id !== currentSeller.id)];
  }

  private async loadDealzMarketplaceCreators() {
    const profiles = await this.prisma.creatorProfile.findMany({
      take: 12,
      orderBy: [{ followers: 'desc' }, { rating: 'desc' }, { updatedAt: 'desc' }]
    });

    return profiles.map((profile) => ({
      id: profile.userId,
      name: profile.name || profile.handle || 'Creator',
      handle: profile.handle ? `@${profile.handle.replace(/^@/, '')}` : '@creator',
      avatarUrl: '',
      verified: Boolean(profile.isKycVerified)
    }));
  }

  private async loadDealzMarketplaceCampaigns(userId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: this.workspaceAccessClause(userId),
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

    return campaigns
      .map((campaign) => this.serializeDealzMarketplaceCampaign(campaign))
      .filter(Boolean) as Array<Record<string, unknown>>;
  }

  private mergeMarketplaceActors(
    current: unknown,
    fallback: Array<Record<string, unknown>>,
    key: 'name' | 'handle'
  ) {
    const primary = Array.isArray(current) ? current.filter((entry) => entry && typeof entry === 'object') as Array<Record<string, unknown>> : [];
    const seen = new Set(
      primary
        .map((entry) => String(entry[key] ?? '').trim().toLowerCase())
        .filter(Boolean)
    );

    const extras = fallback.filter((entry) => {
      const value = String(entry[key] ?? '').trim().toLowerCase();
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });

    return [...primary, ...extras];
  }

  private mergeMarketplaceDeals(current: unknown, fallback: Array<Record<string, unknown>>) {
    const primary = Array.isArray(current)
      ? current.filter((entry) => entry && typeof entry === 'object') as Array<Record<string, unknown>>
      : [];
    const seen = new Set(
      primary
        .map((entry) => String(entry.id ?? '').trim())
        .filter(Boolean)
    );

    const extras = fallback.filter((entry) => {
      const id = String(entry.id ?? '').trim();
      if (!id || seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });

    return [...primary, ...extras];
  }

  private serializeDealzMarketplaceCampaign(campaign: any) {
    const metadata = this.normalizeCampaignMetadata(campaign.metadata);
    const source = typeof metadata.source === 'string' ? metadata.source.trim().toLowerCase() : '';
    const marketplaceType = this.resolveDealzMarketplaceType(metadata);
    if (source !== 'dealz-marketplace' && !marketplaceType) {
      return null;
    }

    const supplierPayload =
      metadata.supplier && typeof metadata.supplier === 'object' && !Array.isArray(metadata.supplier)
        ? metadata.supplier as Record<string, unknown>
        : {};
    const creatorPayload =
      metadata.creator && typeof metadata.creator === 'object' && !Array.isArray(metadata.creator)
        ? metadata.creator as Record<string, unknown>
        : {};
    const shoppable =
      metadata.shoppable && typeof metadata.shoppable === 'object' && !Array.isArray(metadata.shoppable)
        ? metadata.shoppable as Record<string, unknown>
        : null;
    const live =
      metadata.live && typeof metadata.live === 'object' && !Array.isArray(metadata.live)
        ? metadata.live as Record<string, unknown>
        : null;

    return {
      id: campaign.id,
      type: marketplaceType,
      title: campaign.title,
      tagline:
        typeof metadata.tagline === 'string' && metadata.tagline.trim()
          ? metadata.tagline.trim()
          : typeof campaign.description === 'string' && campaign.description.trim()
            ? campaign.description.trim()
            : 'Deal draft',
      supplier: {
        name:
          typeof supplierPayload.name === 'string' && supplierPayload.name.trim()
            ? supplierPayload.name.trim()
            : campaign.seller?.displayName ?? campaign.seller?.storefrontName ?? 'Seller',
        category:
          typeof supplierPayload.category === 'string' && supplierPayload.category.trim()
            ? supplierPayload.category.trim()
            : campaign.seller?.category ?? 'Seller',
        logoUrl:
          typeof supplierPayload.logoUrl === 'string'
            ? supplierPayload.logoUrl
            : ''
      },
      creator: {
        name:
          typeof creatorPayload.name === 'string' && creatorPayload.name.trim()
            ? creatorPayload.name.trim()
            : campaign.creator?.creatorProfile?.name ?? campaign.creator?.email ?? 'Creator',
        handle:
          typeof creatorPayload.handle === 'string' && creatorPayload.handle.trim()
            ? creatorPayload.handle.trim()
            : campaign.creator?.creatorProfile?.handle
              ? `@${String(campaign.creator.creatorProfile.handle).replace(/^@/, '')}`
              : '@creator',
        avatarUrl:
          typeof creatorPayload.avatarUrl === 'string'
            ? creatorPayload.avatarUrl
            : '',
        verified:
          typeof creatorPayload.verified === 'boolean'
            ? creatorPayload.verified
            : Boolean(campaign.creator?.creatorProfile?.isKycVerified)
      },
      startISO: campaign.startAt?.toISOString?.() ?? campaign.startAt ?? new Date().toISOString(),
      endISO: campaign.endAt?.toISOString?.() ?? campaign.endAt ?? new Date().toISOString(),
      notes: typeof metadata.notes === 'string' ? metadata.notes : '',
      shoppable,
      live
    };
  }

  private resolveDealzMarketplaceType(metadata: Record<string, unknown>) {
    const raw = typeof metadata.marketplaceType === 'string' ? metadata.marketplaceType.trim() : '';
    if (raw === 'Shoppable Adz' || raw === 'Live Sessionz' || raw === 'Live + Shoppables') {
      return raw;
    }
    const hasShoppable = Boolean(metadata.shoppable && typeof metadata.shoppable === 'object' && !Array.isArray(metadata.shoppable));
    const hasLive = Boolean(metadata.live && typeof metadata.live === 'object' && !Array.isArray(metadata.live));
    if (hasShoppable && hasLive) {
      return 'Live + Shoppables';
    }
    if (hasShoppable) {
      return 'Shoppable Adz';
    }
    if (hasLive) {
      return 'Live Sessionz';
    }
    return null;
  }

  private resolveCampaignTitle(
    payload: Record<string, unknown>,
    metadata: Record<string, unknown>,
    fallback = 'Untitled campaign'
  ) {
    if (typeof payload.title === 'string' && payload.title.trim()) {
      return payload.title.trim();
    }
    if (typeof metadata.name === 'string' && metadata.name.trim()) {
      return metadata.name.trim();
    }
    return fallback;
  }

  private resolveCampaignBudget(
    payload: Record<string, unknown>,
    metadata: Record<string, unknown>,
    fallback: number | null = null
  ) {
    const raw = typeof payload.budget === 'number' ? payload.budget : metadata.estValue;
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
  }

  private resolveCampaignCurrency(
    payload: Record<string, unknown>,
    metadata: Record<string, unknown>,
    fallback = 'USD'
  ) {
    if (typeof payload.currency === 'string' && payload.currency.trim()) {
      return payload.currency.trim();
    }
    if (typeof metadata.currency === 'string' && metadata.currency.trim()) {
      return metadata.currency.trim();
    }
    return fallback;
  }

  private resolveCampaignStart(
    payload: Record<string, unknown>,
    metadata: Record<string, unknown>,
    fallback: Date | null = null
  ) {
    if (typeof payload.startAt === 'string') {
      const parsed = new Date(payload.startAt);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    if (typeof metadata.startDate === 'string' && metadata.startDate.trim()) {
      const parsed = new Date(`${metadata.startDate}T00:00:00.000Z`);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return fallback;
  }

  private resolveCampaignEnd(
    payload: Record<string, unknown>,
    metadata: Record<string, unknown>,
    fallback: Date | null = null
  ) {
    if (typeof payload.endAt === 'string') {
      const parsed = new Date(payload.endAt);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    if (typeof metadata.endDate === 'string' && metadata.endDate.trim()) {
      const parsed = new Date(`${metadata.endDate}T23:59:59.000Z`);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return fallback;
  }

  private normalizeCampaignStatus(
    raw: unknown,
    metadata: Record<string, unknown>,
    fallback: CampaignStatus = CampaignStatus.DRAFT
  ) {
    if (typeof raw === 'string' && raw.trim()) {
      const direct = raw.trim().toUpperCase();
      if (direct in CampaignStatus) {
        return CampaignStatus[direct as keyof typeof CampaignStatus];
      }
    }

    const stage = String(metadata.stage || '').toLowerCase();
    if (stage === 'execution') {
      return CampaignStatus.ACTIVE;
    }
    if (stage === 'terminated') {
      return CampaignStatus.CANCELLED;
    }
    if (stage === 'completed') {
      return CampaignStatus.COMPLETED;
    }
    if (stage === 'collabs' || stage === 'draft') {
      return CampaignStatus.DRAFT;
    }
    return fallback;
  }

  private async syncCampaignGiveaways(campaignId: string, metadata: Record<string, unknown>) {
    const giveaways = Array.isArray(metadata.giveaways) ? metadata.giveaways : [];
    await this.prisma.liveCampaignGiveaway.deleteMany({
      where: { campaignId }
    });
    if (!giveaways.length) {
      return;
    }
    await this.prisma.liveCampaignGiveaway.createMany({
      data: giveaways.map((giveaway, index) => {
        const entry = giveaway && typeof giveaway === 'object' && !Array.isArray(giveaway)
          ? giveaway as Record<string, unknown>
          : {};
        return {
          id: typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `${campaignId}_gw_${index + 1}`,
          campaignId,
          status: 'active',
          title: typeof entry.title === 'string' ? entry.title : null,
          data: entry as Prisma.InputJsonValue
        };
      })
    });
  }

  private deepMerge(
    base: Record<string, unknown>,
    patch: Record<string, unknown>
  ): Record<string, unknown> {
    const next: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(patch)) {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        next[key] &&
        typeof next[key] === 'object' &&
        !Array.isArray(next[key])
      ) {
        next[key] = this.deepMerge(next[key] as Record<string, unknown>, value as Record<string, unknown>);
        continue;
      }
      next[key] = value;
    }
    return next;
  }

  private serializeContract(contract: any) {
    const metadata = this.normalizeCampaignMetadata(contract.metadata);
    const creatorName = contract.creator?.creatorProfile?.name ?? contract.creator?.email ?? null;
    const creatorHandle = contract.creator?.creatorProfile?.handle ? `@${contract.creator.creatorProfile.handle}` : null;

    return {
      ...contract,
      seller: contract.seller?.displayName ?? null,
      creator: creatorName,
      sellerId: contract.sellerId,
      sellerName: contract.seller?.displayName ?? null,
      creatorId: contract.creatorId,
      creatorUserId: contract.creatorId,
      creatorName,
      creatorHandle,
      campaignName: contract.campaign?.title ?? metadata.campaignTitle ?? null,
      campaign: contract.campaign?.title ?? metadata.campaignTitle ?? null,
      brand: contract.seller?.displayName ?? null,
      totalTasks:
        Array.isArray(metadata.deliverablesList)
          ? metadata.deliverablesList.length
          : Array.isArray(metadata.deliverables)
            ? metadata.deliverables.length
            : 0,
      governance: {
        hostRole: this.readMetadataString(metadata, 'hostRole') || 'Creator',
        creatorUsage: this.readMetadataString(metadata, 'creatorUsageDecision') || 'I will use a Creator',
        collabMode: this.readMetadataString(metadata, 'collabMode') || 'Open for Collabs',
        approvalMode: this.readMetadataString(metadata, 'approvalMode') || 'Manual'
      },
      deliverables: Array.isArray(metadata.deliverablesList)
        ? metadata.deliverablesList
        : Array.isArray(metadata.deliverables)
          ? metadata.deliverables
          : [],
      metadata
    };
  }

  private serializeTask(task: any) {
    const metadata = this.normalizeCampaignMetadata(task.metadata);
    const contract = task.contract ? this.serializeContract(task.contract) : null;
    const campaignMetadata = this.normalizeCampaignMetadata(task.campaign?.metadata);

    return {
      id: task.id,
      campaignId: task.campaignId,
      contractId: task.contractId,
      createdByUserId: task.createdByUserId,
      assigneeUserId: task.assigneeUserId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt?.toISOString?.() ?? task.dueAt ?? null,
      metadata,
      createdAt: task.createdAt?.toISOString?.() ?? task.createdAt ?? null,
      updatedAt: task.updatedAt?.toISOString?.() ?? task.updatedAt ?? null,
      campaign: task.campaign
        ? {
            id: task.campaign.id,
            title: task.campaign.title,
            status: task.campaign.status,
            sellerId: task.campaign.sellerId,
            sellerName: task.campaign.seller?.displayName ?? null,
            creatorId: task.campaign.creatorId,
            creatorName: task.campaign.creator?.creatorProfile?.name ?? task.campaign.creator?.email ?? null,
            creatorHandle: task.campaign.creator?.creatorProfile?.handle ? `@${task.campaign.creator.creatorProfile.handle}` : null,
            metadata: campaignMetadata
          }
        : contract?.campaign
          ? {
              id: contract.campaign.id,
              title: contract.campaign.title,
              status: contract.campaign.status,
              sellerId: contract.campaign.sellerId,
              sellerName: contract.sellerName,
              creatorId: contract.campaign.creatorId,
              creatorName: contract.creatorName,
              creatorHandle: contract.creatorHandle,
              metadata: this.normalizeCampaignMetadata(contract.campaign.metadata)
            }
          : null,
      contract,
      createdBy: this.serializeTaskActor(task.createdBy),
      assignee: this.serializeTaskActor(task.assignee),
      comments: Array.isArray(task.comments)
        ? task.comments.map((comment: any) => ({
            id: comment.id,
            body: comment.body,
            createdAt: comment.createdAt?.toISOString?.() ?? comment.createdAt ?? null,
            authorUserId: comment.authorUserId,
            author: this.serializeTaskActor(comment.author)
          }))
        : [],
      attachments: Array.isArray(task.attachments)
        ? task.attachments.map((attachment: any) => ({
            id: attachment.id,
            name: attachment.name,
            url: attachment.url,
            kind: attachment.kind,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            metadata: attachment.metadata ?? {},
            createdAt: attachment.createdAt?.toISOString?.() ?? attachment.createdAt ?? null,
            addedByUserId: attachment.addedByUserId,
            addedBy: this.serializeTaskActor(attachment.addedBy)
          }))
        : []
    };
  }

  private serializeTaskActor(actor: any) {
    if (!actor) {
      return null;
    }

    return {
      id: actor.id,
      name: actor.creatorProfile?.name ?? actor.sellerProfile?.displayName ?? actor.email ?? null,
      handle: actor.creatorProfile?.handle ? `@${actor.creatorProfile.handle}` : null,
      role: actor.role ?? null
    };
  }

  private readMetadataString(metadata: Record<string, unknown>, key: string) {
    const value = metadata[key];
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }
}
