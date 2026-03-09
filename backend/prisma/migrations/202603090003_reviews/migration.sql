CREATE TABLE `Review` (
  `id` VARCHAR(191) NOT NULL,
  `reviewerUserId` VARCHAR(191) NULL,
  `subjectType` ENUM('CREATOR', 'SELLER', 'LISTING', 'SESSION', 'ORDER', 'CAMPAIGN') NOT NULL DEFAULT 'CREATOR',
  `subjectId` VARCHAR(191) NOT NULL,
  `subjectUserId` VARCHAR(191) NULL,
  `orderId` VARCHAR(191) NULL,
  `sessionId` VARCHAR(191) NULL,
  `campaignId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NULL,
  `buyerName` VARCHAR(191) NULL,
  `buyerType` VARCHAR(191) NULL,
  `roleTarget` VARCHAR(191) NULL,
  `itemType` VARCHAR(191) NULL,
  `channel` VARCHAR(191) NULL,
  `marketplace` VARCHAR(191) NULL,
  `mldzSurface` VARCHAR(191) NULL,
  `sentiment` VARCHAR(191) NULL,
  `requiresResponse` BOOLEAN NOT NULL DEFAULT false,
  `resolvedAt` DATETIME(3) NULL,
  `flaggedAt` DATETIME(3) NULL,
  `ratingOverall` DOUBLE NOT NULL,
  `ratingBreakdown` JSON NULL,
  `quickTags` JSON NULL,
  `issueTags` JSON NULL,
  `reviewText` TEXT NULL,
  `wouldJoinAgain` BOOLEAN NULL,
  `transactionIntent` VARCHAR(191) NULL,
  `isPublic` BOOLEAN NOT NULL DEFAULT true,
  `isAnonymous` BOOLEAN NOT NULL DEFAULT false,
  `status` ENUM('PUBLISHED', 'HIDDEN', 'FLAGGED') NOT NULL DEFAULT 'PUBLISHED',
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Review_subjectType_subjectId_idx`(`subjectType`, `subjectId`),
  INDEX `Review_subjectUserId_createdAt_idx`(`subjectUserId`, `createdAt`),
  INDEX `Review_reviewerUserId_createdAt_idx`(`reviewerUserId`, `createdAt`),
  INDEX `Review_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `Review_orderId_idx`(`orderId`),
  INDEX `Review_sessionId_idx`(`sessionId`),
  INDEX `Review_campaignId_idx`(`campaignId`),
  INDEX `Review_channel_idx`(`channel`),
  INDEX `Review_marketplace_idx`(`marketplace`),
  INDEX `Review_sentiment_idx`(`sentiment`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Review`
  ADD CONSTRAINT `Review_reviewerUserId_fkey` FOREIGN KEY (`reviewerUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Review_subjectUserId_fkey` FOREIGN KEY (`subjectUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `ReviewReply` (
  `id` VARCHAR(191) NOT NULL,
  `reviewId` VARCHAR(191) NOT NULL,
  `authorUserId` VARCHAR(191) NULL,
  `body` TEXT NOT NULL,
  `visibility` ENUM('PUBLIC', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ReviewReply_reviewId_createdAt_idx`(`reviewId`, `createdAt`),
  INDEX `ReviewReply_authorUserId_idx`(`authorUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ReviewReply`
  ADD CONSTRAINT `ReviewReply_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `Review`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ReviewReply_authorUserId_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
