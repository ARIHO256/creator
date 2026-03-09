-- Extend shared auth roles
ALTER TABLE `User`
  MODIFY `role` ENUM('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT') NOT NULL DEFAULT 'CREATOR';

-- Add user role assignments for multi-role workspaces
CREATE TABLE `UserRoleAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `role` ENUM('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `UserRoleAssignment_userId_role_key`(`userId`, `role`),
  INDEX `UserRoleAssignment_role_idx`(`role`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Promote sellers to first-class user-backed profiles
ALTER TABLE `Seller`
  ADD COLUMN `userId` VARCHAR(191) NULL,
  ADD COLUMN `handle` VARCHAR(191) NULL,
  ADD COLUMN `displayName` VARCHAR(191) NULL,
  ADD COLUMN `legalBusinessName` VARCHAR(191) NULL,
  ADD COLUMN `storefrontName` VARCHAR(191) NULL,
  ADD COLUMN `kind` ENUM('SELLER', 'PROVIDER', 'BRAND') NOT NULL DEFAULT 'SELLER',
  ADD COLUMN `categories` TEXT NULL,
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `languages` TEXT NULL;

UPDATE `Seller`
SET `displayName` = `name`
WHERE `displayName` IS NULL;

ALTER TABLE `Seller`
  MODIFY `displayName` VARCHAR(191) NOT NULL,
  ADD UNIQUE INDEX `Seller_userId_key`(`userId`),
  ADD UNIQUE INDEX `Seller_handle_key`(`handle`);

-- Discovery upgrades
ALTER TABLE `Opportunity`
  ADD COLUMN `createdByUserId` VARCHAR(191) NULL,
  ADD COLUMN `metadata` JSON NULL,
  ADD INDEX `Opportunity_createdByUserId_idx`(`createdByUserId`);

-- Shared marketplace ownership and richer listing metadata
ALTER TABLE `MarketplaceListing`
  ADD COLUMN `sellerId` VARCHAR(191) NULL,
  ADD COLUMN `kind` VARCHAR(191) NULL,
  ADD COLUMN `category` VARCHAR(191) NULL,
  ADD COLUMN `sku` VARCHAR(191) NULL,
  ADD COLUMN `marketplace` VARCHAR(191) NULL,
  ADD COLUMN `inventoryCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `metadata` JSON NULL,
  ADD INDEX `MarketplaceListing_sellerId_idx`(`sellerId`);

ALTER TABLE `MarketplaceListing`
  MODIFY `status` ENUM('DRAFT', 'IN_REVIEW', 'ACTIVE', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT';

-- Shared campaign and collaboration domain
CREATE TABLE `Campaign` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `creatorId` VARCHAR(191) NULL,
  `opportunityId` VARCHAR(191) NULL,
  `createdByUserId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('DRAFT', 'OPEN', 'NEGOTIATION', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `budget` DOUBLE NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `metadata` JSON NULL,
  `startAt` DATETIME(3) NULL,
  `endAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `Campaign_sellerId_idx`(`sellerId`),
  INDEX `Campaign_creatorId_idx`(`creatorId`),
  INDEX `Campaign_opportunityId_idx`(`opportunityId`),
  INDEX `Campaign_status_idx`(`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Proposal` (
  `id` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `creatorId` VARCHAR(191) NOT NULL,
  `submittedByUserId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `summary` TEXT NULL,
  `amount` DOUBLE NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `status` ENUM('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'DRAFT',
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `Proposal_campaignId_idx`(`campaignId`),
  INDEX `Proposal_sellerId_idx`(`sellerId`),
  INDEX `Proposal_creatorId_idx`(`creatorId`),
  INDEX `Proposal_submittedByUserId_idx`(`submittedByUserId`),
  INDEX `Proposal_status_idx`(`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProposalMessage` (
  `id` VARCHAR(191) NOT NULL,
  `proposalId` VARCHAR(191) NOT NULL,
  `authorUserId` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `messageType` VARCHAR(191) NOT NULL DEFAULT 'COMMENT',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ProposalMessage_proposalId_createdAt_idx`(`proposalId`, `createdAt`),
  INDEX `ProposalMessage_authorUserId_idx`(`authorUserId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Contract` (
  `id` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NULL,
  `proposalId` VARCHAR(191) NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `creatorId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `scope` TEXT NULL,
  `value` DOUBLE NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `status` ENUM('DRAFT', 'ACTIVE', 'TERMINATION_REQUESTED', 'TERMINATED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `startAt` DATETIME(3) NULL,
  `endAt` DATETIME(3) NULL,
  `terminationRequestedAt` DATETIME(3) NULL,
  `terminationReason` TEXT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `Contract_campaignId_idx`(`campaignId`),
  INDEX `Contract_proposalId_idx`(`proposalId`),
  INDEX `Contract_sellerId_idx`(`sellerId`),
  INDEX `Contract_creatorId_idx`(`creatorId`),
  INDEX `Contract_status_idx`(`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Task` (
  `id` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NULL,
  `contractId` VARCHAR(191) NULL,
  `createdByUserId` VARCHAR(191) NOT NULL,
  `assigneeUserId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'BLOCKED', 'COMPLETED') NOT NULL DEFAULT 'TODO',
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  `dueAt` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `Task_campaignId_idx`(`campaignId`),
  INDEX `Task_contractId_idx`(`contractId`),
  INDEX `Task_createdByUserId_idx`(`createdByUserId`),
  INDEX `Task_assigneeUserId_idx`(`assigneeUserId`),
  INDEX `Task_status_idx`(`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TaskComment` (
  `id` VARCHAR(191) NOT NULL,
  `taskId` VARCHAR(191) NOT NULL,
  `authorUserId` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `TaskComment_taskId_createdAt_idx`(`taskId`, `createdAt`),
  INDEX `TaskComment_authorUserId_idx`(`authorUserId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TaskAttachment` (
  `id` VARCHAR(191) NOT NULL,
  `taskId` VARCHAR(191) NOT NULL,
  `addedByUserId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `url` VARCHAR(191) NULL,
  `kind` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `TaskAttachment_taskId_idx`(`taskId`),
  INDEX `TaskAttachment_addedByUserId_idx`(`addedByUserId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DeliverableAsset` (
  `id` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NULL,
  `contractId` VARCHAR(191) NULL,
  `ownerUserId` VARCHAR(191) NOT NULL,
  `reviewerUserId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `assetType` VARCHAR(191) NOT NULL,
  `url` VARCHAR(191) NULL,
  `status` ENUM('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
  `reviewNotes` TEXT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `DeliverableAsset_campaignId_idx`(`campaignId`),
  INDEX `DeliverableAsset_contractId_idx`(`contractId`),
  INDEX `DeliverableAsset_ownerUserId_idx`(`ownerUserId`),
  INDEX `DeliverableAsset_reviewerUserId_idx`(`reviewerUserId`),
  INDEX `DeliverableAsset_status_idx`(`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CollaborationInvite` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NULL,
  `opportunityId` VARCHAR(191) NULL,
  `campaignId` VARCHAR(191) NULL,
  `senderUserId` VARCHAR(191) NOT NULL,
  `recipientUserId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NULL,
  `status` ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `CollaborationInvite_sellerId_idx`(`sellerId`),
  INDEX `CollaborationInvite_opportunityId_idx`(`opportunityId`),
  INDEX `CollaborationInvite_campaignId_idx`(`campaignId`),
  INDEX `CollaborationInvite_senderUserId_idx`(`senderUserId`),
  INDEX `CollaborationInvite_recipientUserId_idx`(`recipientUserId`),
  INDEX `CollaborationInvite_status_idx`(`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Shared commerce records for seller app support
CREATE TABLE `Order` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `buyerUserId` VARCHAR(191) NULL,
  `channel` VARCHAR(191) NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `total` DOUBLE NOT NULL DEFAULT 0,
  `itemCount` INTEGER NOT NULL DEFAULT 0,
  `status` ENUM('NEW', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'ON_HOLD', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED') NOT NULL DEFAULT 'NEW',
  `warehouse` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `Order_sellerId_idx`(`sellerId`),
  INDEX `Order_buyerUserId_idx`(`buyerUserId`),
  INDEX `Order_status_idx`(`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OrderItem` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `listingId` VARCHAR(191) NULL,
  `sku` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `qty` INTEGER NOT NULL,
  `unitPrice` DOUBLE NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  PRIMARY KEY (`id`),
  INDEX `OrderItem_orderId_idx`(`orderId`),
  INDEX `OrderItem_listingId_idx`(`listingId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Transaction` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NULL,
  `orderId` VARCHAR(191) NULL,
  `type` ENUM('ORDER_PAYMENT', 'COMMISSION', 'PAYOUT', 'REFUND', 'ADJUSTMENT') NOT NULL,
  `status` ENUM('PENDING', 'AVAILABLE', 'PAID', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `amount` DOUBLE NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `note` TEXT NULL,
  `availableAt` DATETIME(3) NULL,
  `paidAt` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `Transaction_userId_idx`(`userId`),
  INDEX `Transaction_sellerId_idx`(`sellerId`),
  INDEX `Transaction_orderId_idx`(`orderId`),
  INDEX `Transaction_type_status_idx`(`type`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys
ALTER TABLE `UserRoleAssignment`
  ADD CONSTRAINT `UserRoleAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Seller`
  ADD CONSTRAINT `Seller_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Opportunity`
  ADD CONSTRAINT `Opportunity_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketplaceListing`
  ADD CONSTRAINT `MarketplaceListing_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Campaign`
  ADD CONSTRAINT `Campaign_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Campaign_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Campaign_opportunityId_fkey` FOREIGN KEY (`opportunityId`) REFERENCES `Opportunity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Campaign_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Proposal`
  ADD CONSTRAINT `Proposal_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Proposal_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Proposal_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Proposal_submittedByUserId_fkey` FOREIGN KEY (`submittedByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProposalMessage`
  ADD CONSTRAINT `ProposalMessage_proposalId_fkey` FOREIGN KEY (`proposalId`) REFERENCES `Proposal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ProposalMessage_authorUserId_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Contract`
  ADD CONSTRAINT `Contract_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Contract_proposalId_fkey` FOREIGN KEY (`proposalId`) REFERENCES `Proposal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Contract_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Contract_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Task`
  ADD CONSTRAINT `Task_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Task_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Task_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Task_assigneeUserId_fkey` FOREIGN KEY (`assigneeUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `TaskComment`
  ADD CONSTRAINT `TaskComment_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TaskComment_authorUserId_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TaskAttachment`
  ADD CONSTRAINT `TaskAttachment_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TaskAttachment_addedByUserId_fkey` FOREIGN KEY (`addedByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DeliverableAsset`
  ADD CONSTRAINT `DeliverableAsset_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `DeliverableAsset_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `DeliverableAsset_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `DeliverableAsset_reviewerUserId_fkey` FOREIGN KEY (`reviewerUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `CollaborationInvite`
  ADD CONSTRAINT `CollaborationInvite_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `CollaborationInvite_opportunityId_fkey` FOREIGN KEY (`opportunityId`) REFERENCES `Opportunity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `CollaborationInvite_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `CollaborationInvite_senderUserId_fkey` FOREIGN KEY (`senderUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CollaborationInvite_recipientUserId_fkey` FOREIGN KEY (`recipientUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Order`
  ADD CONSTRAINT `Order_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Order_buyerUserId_fkey` FOREIGN KEY (`buyerUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `OrderItem`
  ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `OrderItem_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `MarketplaceListing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Transaction`
  ADD CONSTRAINT `Transaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Transaction_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Transaction_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
