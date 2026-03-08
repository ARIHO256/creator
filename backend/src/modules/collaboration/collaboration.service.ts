import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeFileIntake } from '../../common/files/file-intake.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AppRecordsService } from '../../platform/app-records.service.js';
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
    private readonly prisma: PrismaService,
    private readonly records: AppRecordsService
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

    if (campaigns.length > 0) {
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

    return this.records
      .list('collaboration', 'campaign', userId)
      .then((rows) => rows.map((row) => ({ id: row.entityId, ...(row.payload as object) })));
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

    if (proposals.length > 0) {
      return proposals.map((proposal: any) => this.serializeProposal(proposal));
    }

    return this.records
      .list('collaboration', 'proposal', userId)
      .then((rows) => rows.map((row) => ({ id: row.entityId, ...(row.payload as object) })));
  }

  async createProposal(userId: string, payload: CreateProposalDto) {
    const actor = await this.loadActor(userId);
    const campaign = payload.campaignId
      ? await this.prisma.campaign.findUnique({ where: { id: payload.campaignId } })
      : null;

    const sellerId = payload.sellerId || campaign?.sellerId || actor.sellerProfile?.id;
    const creatorId = payload.creatorId || campaign?.creatorId || (actor.creatorProfile ? actor.id : undefined);

    if (!sellerId || !creatorId) {
      throw new BadRequestException('Proposal requires both sellerId and creatorId');
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

    if (proposal) {
      return this.serializeProposal(proposal);
    }

    const legacy = await this.records.getByEntityId('collaboration', 'proposal', id, userId);
    return { id: legacy.entityId, ...(legacy.payload as object) };
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

    if (contracts.length > 0) {
      return contracts.map((contract: any) => ({
        ...contract,
        seller: contract.seller.displayName,
        creator: contract.creator.creatorProfile?.name ?? contract.creator.email
      }));
    }

    return this.records
      .list('collaboration', 'contract', userId)
      .then((rows) => rows.map((row) => ({ id: row.entityId, ...(row.payload as object) })));
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

    if (contract) {
      return {
        ...contract,
        seller: contract.seller.displayName,
        creator: contract.creator.creatorProfile?.name ?? contract.creator.email
      };
    }

    const legacy = await this.records.getByEntityId('collaboration', 'contract', id, userId);
    return { id: legacy.entityId, ...(legacy.payload as object) };
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
        comments: true,
        attachments: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (tasks.length > 0) {
      return tasks;
    }

    return this.records
      .list('collaboration', 'task', userId)
      .then((rows) => rows.map((row) => ({ id: row.entityId, ...(row.payload as object) })));
  }

  async task(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, ...this.taskAccessClause(userId) },
      include: {
        comments: {
          orderBy: { createdAt: 'asc' }
        },
        attachments: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (task) {
      return task;
    }

    const legacy = await this.records.getByEntityId('collaboration', 'task', id, userId);
    return { id: legacy.entityId, ...(legacy.payload as object) };
  }

  createTask(userId: string, payload: CreateTaskDto) {
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

    if (assets.length > 0) {
      return assets;
    }

    return this.records
      .list('collaboration', 'asset', userId)
      .then((rows) => rows.map((row) => ({ id: row.entityId, ...(row.payload as object) })));
  }

  async asset(userId: string, id: string) {
    const asset = await this.prisma.deliverableAsset.findFirst({
      where: { id, ...this.assetAccessClause(userId) }
    });

    if (asset) {
      return asset;
    }

    const legacy = await this.records.getByEntityId('collaboration', 'asset', id, userId);
    return { id: legacy.entityId, ...(legacy.payload as object) };
  }

  createAsset(userId: string, payload: CreateAssetDto) {
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
}
