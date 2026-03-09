-- AlterTable
ALTER TABLE `Seller` MODIFY `type` VARCHAR(191) NOT NULL DEFAULT 'Seller';

-- CreateIndex
CREATE INDEX `AnalyticsEvent_userId_createdAt_idx` ON `AnalyticsEvent`(`userId`, `createdAt`);

-- CreateIndex
CREATE INDEX `AppRecord_userId_domain_entityType_updatedAt_idx` ON `AppRecord`(`userId`, `domain`, `entityType`, `updatedAt`);

-- CreateIndex
CREATE INDEX `AppRecord_domain_entityType_entityId_userId_idx` ON `AppRecord`(`domain`, `entityType`, `entityId`, `userId`);

-- CreateIndex
CREATE INDEX `Campaign_sellerId_updatedAt_idx` ON `Campaign`(`sellerId`, `updatedAt`);

-- CreateIndex
CREATE INDEX `Campaign_creatorId_updatedAt_idx` ON `Campaign`(`creatorId`, `updatedAt`);

-- CreateIndex
CREATE INDEX `CollaborationInvite_recipientUserId_updatedAt_idx` ON `CollaborationInvite`(`recipientUserId`, `updatedAt`);

-- CreateIndex
CREATE INDEX `MarketplaceListing_status_createdAt_idx` ON `MarketplaceListing`(`status`, `createdAt`);

-- CreateIndex
CREATE INDEX `MarketplaceListing_sellerId_createdAt_idx` ON `MarketplaceListing`(`sellerId`, `createdAt`);

-- CreateIndex
CREATE INDEX `MarketplaceListing_userId_updatedAt_idx` ON `MarketplaceListing`(`userId`, `updatedAt`);

-- CreateIndex
CREATE INDEX `Opportunity_status_createdAt_idx` ON `Opportunity`(`status`, `createdAt`);

-- CreateIndex
CREATE INDEX `Order_sellerId_updatedAt_idx` ON `Order`(`sellerId`, `updatedAt`);

-- CreateIndex
CREATE INDEX `Order_buyerUserId_updatedAt_idx` ON `Order`(`buyerUserId`, `updatedAt`);

-- CreateIndex
CREATE INDEX `Proposal_sellerId_updatedAt_idx` ON `Proposal`(`sellerId`, `updatedAt`);

-- CreateIndex
CREATE INDEX `Proposal_creatorId_updatedAt_idx` ON `Proposal`(`creatorId`, `updatedAt`);

-- CreateIndex
CREATE INDEX `Seller_isVerified_rating_createdAt_idx` ON `Seller`(`isVerified`, `rating`, `createdAt`);

-- CreateIndex
CREATE INDEX `Seller_kind_createdAt_idx` ON `Seller`(`kind`, `createdAt`);

-- CreateIndex
CREATE INDEX `Transaction_userId_createdAt_idx` ON `Transaction`(`userId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Transaction_sellerId_createdAt_idx` ON `Transaction`(`sellerId`, `createdAt`);
