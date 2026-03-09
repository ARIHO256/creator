CREATE TABLE `StorefrontTaxonomyLink` (
  `id` VARCHAR(191) NOT NULL,
  `storefrontId` VARCHAR(191) NOT NULL,
  `taxonomyNodeId` VARCHAR(191) NOT NULL,
  `isPrimary` BOOLEAN NOT NULL DEFAULT false,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `pathSnapshot` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `StorefrontTaxonomyLink_storefrontId_taxonomyNodeId_key`(`storefrontId`, `taxonomyNodeId`),
  INDEX `StorefrontTaxonomyLink_storefrontId_isPrimary_idx`(`storefrontId`, `isPrimary`),
  INDEX `StorefrontTaxonomyLink_taxonomyNodeId_idx`(`taxonomyNodeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MessageThread` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'open',
  `channel` VARCHAR(191) NULL,
  `priority` VARCHAR(191) NULL,
  `lastMessageAt` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `MessageThread_userId_updatedAt_idx`(`userId`, `updatedAt`),
  INDEX `MessageThread_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Message` (
  `id` VARCHAR(191) NOT NULL,
  `threadId` VARCHAR(191) NOT NULL,
  `senderUserId` VARCHAR(191) NULL,
  `senderRole` VARCHAR(191) NULL,
  `body` TEXT NOT NULL,
  `lang` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `Message_threadId_createdAt_idx`(`threadId`, `createdAt`),
  INDEX `Message_senderUserId_idx`(`senderUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SupportTicket` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'Open',
  `marketplace` VARCHAR(191) NULL,
  `category` VARCHAR(191) NULL,
  `subject` VARCHAR(191) NULL,
  `severity` VARCHAR(191) NULL,
  `ref` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `SupportTicket_userId_status_idx`(`userId`, `status`),
  INDEX `SupportTicket_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SupportContent` (
  `id` VARCHAR(191) NOT NULL,
  `contentType` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `body` TEXT NULL,
  `status` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `SupportContent_contentType_updatedAt_idx`(`contentType`, `updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProviderQuote` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `title` VARCHAR(191) NULL,
  `buyer` VARCHAR(191) NULL,
  `amount` DOUBLE NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ProviderQuote_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProviderBooking` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'requested',
  `scheduledAt` DATETIME(3) NULL,
  `durationMinutes` INT NULL,
  `amount` DOUBLE NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ProviderBooking_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProviderConsultation` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'open',
  `scheduledAt` DATETIME(3) NULL,
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ProviderConsultation_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProviderPortfolioItem` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `mediaUrl` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'active',
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ProviderPortfolioItem_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WholesaleRfq` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'new',
  `title` VARCHAR(191) NULL,
  `buyerName` VARCHAR(191) NULL,
  `buyerType` VARCHAR(191) NULL,
  `urgency` VARCHAR(191) NULL,
  `origin` VARCHAR(191) NULL,
  `destination` VARCHAR(191) NULL,
  `paymentRail` VARCHAR(191) NULL,
  `approvalRequired` BOOLEAN NOT NULL DEFAULT false,
  `dueAt` DATETIME(3) NULL,
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `WholesaleRfq_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WholesaleQuote` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `rfqId` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `title` VARCHAR(191) NULL,
  `buyer` VARCHAR(191) NULL,
  `buyerType` VARCHAR(191) NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `total` DOUBLE NULL,
  `approvalsRequired` BOOLEAN NOT NULL DEFAULT false,
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `WholesaleQuote_userId_status_idx`(`userId`, `status`),
  INDEX `WholesaleQuote_rfqId_idx`(`rfqId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WholesalePriceList` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `WholesalePriceList_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WholesaleIncoterm` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `riskTransferPoint` VARCHAR(191) NULL,
  `sellerObligation` VARCHAR(191) NULL,
  `buyerObligation` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `WholesaleIncoterm_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LiveBuilder` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `published` BOOLEAN NOT NULL DEFAULT false,
  `publishedAt` DATETIME(3) NULL,
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `LiveBuilder_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LiveSession` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `title` VARCHAR(191) NULL,
  `scheduledAt` DATETIME(3) NULL,
  `startedAt` DATETIME(3) NULL,
  `endedAt` DATETIME(3) NULL,
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `LiveSession_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LiveStudio` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'idle',
  `startedAt` DATETIME(3) NULL,
  `endedAt` DATETIME(3) NULL,
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `LiveStudio_sessionId_key`(`sessionId`),
  INDEX `LiveStudio_userId_sessionId_idx`(`userId`, `sessionId`),
  INDEX `LiveStudio_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LiveMoment` (
  `id` VARCHAR(191) NOT NULL,
  `studioId` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NULL,
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `LiveMoment_studioId_createdAt_idx`(`studioId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LiveReplay` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `published` BOOLEAN NOT NULL DEFAULT false,
  `publishedAt` DATETIME(3) NULL,
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `LiveReplay_sessionId_key`(`sessionId`),
  INDEX `LiveReplay_userId_status_idx`(`userId`, `status`),
  INDEX `LiveReplay_sessionId_idx`(`sessionId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LiveToolConfig` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `LiveToolConfig_userId_key_key`(`userId`, `key`),
  INDEX `LiveToolConfig_userId_key_idx`(`userId`, `key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LiveCampaignGiveaway` (
  `id` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'active',
  `title` VARCHAR(191) NULL,
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `LiveCampaignGiveaway_campaignId_createdAt_idx`(`campaignId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdzBuilder` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `published` BOOLEAN NOT NULL DEFAULT false,
  `publishedAt` DATETIME(3) NULL,
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `AdzBuilder_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdzCampaign` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `title` VARCHAR(191) NULL,
  `budget` DOUBLE NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `isMarketplace` BOOLEAN NOT NULL DEFAULT false,
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `AdzCampaign_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdzPerformance` (
  `id` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NOT NULL,
  `clicks` INT NOT NULL DEFAULT 0,
  `purchases` INT NOT NULL DEFAULT 0,
  `earnings` DOUBLE NOT NULL DEFAULT 0,
  `data` JSON NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `AdzPerformance_campaignId_key`(`campaignId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdzLink` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'active',
  `url` VARCHAR(191) NULL,
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `AdzLink_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PromoAd` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `data` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `PromoAd_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RegulatoryDesk` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'active',
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `RegulatoryDesk_userId_slug_key`(`userId`, `slug`),
  INDEX `RegulatoryDesk_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RegulatoryDeskItem` (
  `id` VARCHAR(191) NOT NULL,
  `deskId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'open',
  `severity` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `RegulatoryDeskItem_deskId_status_idx`(`deskId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RegulatoryComplianceItem` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `itemType` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'open',
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `RegulatoryComplianceItem_userId_itemType_idx`(`userId`, `itemType`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `StorefrontTaxonomyLink`
  ADD CONSTRAINT `StorefrontTaxonomyLink_storefrontId_fkey` FOREIGN KEY (`storefrontId`) REFERENCES `Storefront`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `StorefrontTaxonomyLink_taxonomyNodeId_fkey` FOREIGN KEY (`taxonomyNodeId`) REFERENCES `TaxonomyNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MessageThread`
  ADD CONSTRAINT `MessageThread_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Message`
  ADD CONSTRAINT `Message_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `MessageThread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Message_senderUserId_fkey` FOREIGN KEY (`senderUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SupportTicket`
  ADD CONSTRAINT `SupportTicket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProviderQuote`
  ADD CONSTRAINT `ProviderQuote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProviderBooking`
  ADD CONSTRAINT `ProviderBooking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProviderConsultation`
  ADD CONSTRAINT `ProviderConsultation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProviderPortfolioItem`
  ADD CONSTRAINT `ProviderPortfolioItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WholesaleRfq`
  ADD CONSTRAINT `WholesaleRfq_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WholesaleQuote`
  ADD CONSTRAINT `WholesaleQuote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WholesalePriceList`
  ADD CONSTRAINT `WholesalePriceList_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `LiveBuilder`
  ADD CONSTRAINT `LiveBuilder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `LiveSession`
  ADD CONSTRAINT `LiveSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `LiveStudio`
  ADD CONSTRAINT `LiveStudio_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `LiveStudio_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `LiveSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `LiveMoment`
  ADD CONSTRAINT `LiveMoment_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `LiveStudio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `LiveReplay`
  ADD CONSTRAINT `LiveReplay_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `LiveReplay_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `LiveSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `LiveToolConfig`
  ADD CONSTRAINT `LiveToolConfig_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AdzBuilder`
  ADD CONSTRAINT `AdzBuilder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AdzCampaign`
  ADD CONSTRAINT `AdzCampaign_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AdzPerformance`
  ADD CONSTRAINT `AdzPerformance_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `AdzCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AdzLink`
  ADD CONSTRAINT `AdzLink_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PromoAd`
  ADD CONSTRAINT `PromoAd_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `RegulatoryDesk`
  ADD CONSTRAINT `RegulatoryDesk_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `RegulatoryDeskItem`
  ADD CONSTRAINT `RegulatoryDeskItem_deskId_fkey` FOREIGN KEY (`deskId`) REFERENCES `RegulatoryDesk`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `RegulatoryComplianceItem`
  ADD CONSTRAINT `RegulatoryComplianceItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Review`
  MODIFY `subjectType` ENUM('CREATOR', 'SELLER', 'PROVIDER', 'LISTING', 'SESSION', 'ORDER', 'CAMPAIGN') NOT NULL DEFAULT 'CREATOR';
