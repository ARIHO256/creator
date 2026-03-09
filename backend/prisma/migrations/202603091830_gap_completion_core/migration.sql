CREATE TABLE `SettlementBatch` (
  `id` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING','PROCESSING','COMPLETED','RECONCILED','FAILED') NOT NULL DEFAULT 'PENDING',
  `totalAmount` DOUBLE NOT NULL DEFAULT 0,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `itemCount` INT NOT NULL DEFAULT 0,
  `createdByUserId` VARCHAR(191) NULL,
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `reconciledAt` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `SettlementBatch_status_idx` (`status`),
  INDEX `SettlementBatch_createdAt_idx` (`createdAt`),
  CONSTRAINT `SettlementBatch_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SettlementItem` (
  `id` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NOT NULL,
  `transactionId` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `status` ENUM('PENDING','PROCESSING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  `error` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `SettlementItem_batchId_transactionId_key` (`batchId`, `transactionId`),
  INDEX `SettlementItem_transactionId_idx` (`transactionId`),
  INDEX `SettlementItem_sellerId_idx` (`sellerId`),
  INDEX `SettlementItem_status_idx` (`status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SettlementItem_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `SettlementBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SettlementItem_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SettlementItem_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `SettlementItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReconciliationRun` (
  `id` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  `summary` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `ReconciliationRun_batchId_status_idx` (`batchId`, `status`),
  CONSTRAINT `ReconciliationRun_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `SettlementBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DeliveryReceipt` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `channel` VARCHAR(191) NULL,
  `eventType` VARCHAR(191) NULL,
  `status` ENUM('PENDING','DELIVERED','ACKED','FAILED') NOT NULL DEFAULT 'PENDING',
  `attempts` INT NOT NULL DEFAULT 0,
  `lastAttemptAt` DATETIME(3) NULL,
  `ackedAt` DATETIME(3) NULL,
  `payload` JSON NULL,
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `DeliveryReceipt_userId_eventId_key` (`userId`, `eventId`),
  INDEX `DeliveryReceipt_userId_status_createdAt_idx` (`userId`, `status`, `createdAt`),
  INDEX `DeliveryReceipt_expiresAt_idx` (`expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `DeliveryReceipt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ModerationFlag` (
  `id` VARCHAR(191) NOT NULL,
  `targetType` VARCHAR(191) NOT NULL,
  `targetId` VARCHAR(191) NOT NULL,
  `status` ENUM('OPEN','RESOLVED','ESCALATED') NOT NULL DEFAULT 'OPEN',
  `severity` ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  `reason` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `resolvedByUserId` VARCHAR(191) NULL,
  `resolvedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `ModerationFlag_targetType_targetId_idx` (`targetType`, `targetId`),
  INDEX `ModerationFlag_status_severity_idx` (`status`, `severity`),
  INDEX `ModerationFlag_resolvedAt_idx` (`resolvedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ModerationFlag_resolvedByUserId_fkey` FOREIGN KEY (`resolvedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContentScanResult` (
  `id` VARCHAR(191) NOT NULL,
  `targetType` VARCHAR(191) NOT NULL,
  `targetId` VARCHAR(191) NOT NULL,
  `scanner` VARCHAR(191) NOT NULL,
  `verdict` ENUM('CLEAN','FLAGGED','BLOCKED') NOT NULL,
  `score` DOUBLE NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `ContentScanResult_targetType_targetId_idx` (`targetType`, `targetId`),
  INDEX `ContentScanResult_verdict_createdAt_idx` (`verdict`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RegulatoryAutoCheck` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `deskId` VARCHAR(191) NULL,
  `complianceItemId` VARCHAR(191) NULL,
  `ruleKey` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING','PASSED','FAILED','NEEDS_REVIEW') NOT NULL DEFAULT 'PENDING',
  `result` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `RegulatoryAutoCheck_userId_status_idx` (`userId`, `status`),
  INDEX `RegulatoryAutoCheck_ruleKey_idx` (`ruleKey`),
  INDEX `RegulatoryAutoCheck_deskId_idx` (`deskId`),
  INDEX `RegulatoryAutoCheck_complianceItemId_idx` (`complianceItemId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RegulatoryAutoCheck_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `RegulatoryAutoCheck_deskId_fkey` FOREIGN KEY (`deskId`) REFERENCES `RegulatoryDesk`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `RegulatoryAutoCheck_complianceItemId_fkey` FOREIGN KEY (`complianceItemId`) REFERENCES `RegulatoryComplianceItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EvidenceBundle` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` ENUM('QUEUED','GENERATING','READY','FAILED') NOT NULL DEFAULT 'QUEUED',
  `storageKey` VARCHAR(191) NULL,
  `fileUrl` VARCHAR(191) NULL,
  `mimeType` VARCHAR(191) NULL,
  `sizeBytes` INT NULL,
  `expiresAt` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `EvidenceBundle_userId_status_idx` (`userId`, `status`),
  INDEX `EvidenceBundle_expiresAt_idx` (`expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `EvidenceBundle_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CatalogTemplatePreset` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `templateIds` JSON NULL,
  `payload` JSON NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `CatalogTemplatePreset_sellerId_name_key` (`sellerId`, `name`),
  INDEX `CatalogTemplatePreset_sellerId_createdAt_idx` (`sellerId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `CatalogTemplatePreset_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CatalogImportJob` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `status` ENUM('QUEUED','RUNNING','COMPLETED','FAILED') NOT NULL DEFAULT 'QUEUED',
  `totalCount` INT NOT NULL DEFAULT 0,
  `successCount` INT NOT NULL DEFAULT 0,
  `errorCount` INT NOT NULL DEFAULT 0,
  `errorReport` JSON NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `CatalogImportJob_sellerId_status_createdAt_idx` (`sellerId`, `status`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `CatalogImportJob_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProviderFulfillment` (
  `id` VARCHAR(191) NOT NULL,
  `bookingId` VARCHAR(191) NOT NULL,
  `status` ENUM('OPEN','IN_PROGRESS','COMPLETED','DISPUTED','CANCELLED') NOT NULL DEFAULT 'OPEN',
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ProviderFulfillment_bookingId_key` (`bookingId`),
  INDEX `ProviderFulfillment_status_idx` (`status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ProviderFulfillment_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `ProviderBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SearchDocument` (
  `id` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NULL,
  `content` TEXT NOT NULL,
  `payload` JSON NULL,
  `locale` VARCHAR(191) NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `SearchDocument_entityType_entityId_key` (`entityType`, `entityId`),
  INDEX `SearchDocument_entityType_updatedAt_idx` (`entityType`, `updatedAt`),
  FULLTEXT INDEX `SearchDocument_title_content_fulltext` (`title`, `content`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SearchIndexState` (
  `id` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `cursor` VARCHAR(191) NULL,
  `lastIndexedAt` DATETIME(3) NULL,
  `status` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `SearchIndexState_entityType_key` (`entityType`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

