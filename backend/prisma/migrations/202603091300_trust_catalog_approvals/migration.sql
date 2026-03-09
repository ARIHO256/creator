CREATE TABLE `CatalogTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `payload` JSON NOT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `CatalogTemplate_sellerId_idx` ON `CatalogTemplate`(`sellerId`);
CREATE INDEX `CatalogTemplate_sellerId_status_idx` ON `CatalogTemplate`(`sellerId`, `status`);
CREATE INDEX `CatalogTemplate_kind_idx` ON `CatalogTemplate`(`kind`);

ALTER TABLE `CatalogTemplate`
  ADD CONSTRAINT `CatalogTemplate_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `TrustContent` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `body` TEXT NULL,
  `category` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `TrustContent_category_idx` ON `TrustContent`(`category`);
CREATE INDEX `TrustContent_status_idx` ON `TrustContent`(`status`);
CREATE INDEX `TrustContent_updatedAt_idx` ON `TrustContent`(`updatedAt`);

CREATE TABLE `TrustIncident` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'INVESTIGATING',
  `severity` VARCHAR(191) NOT NULL DEFAULT 'minor',
  `summary` TEXT NULL,
  `impact` TEXT NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `resolvedAt` DATETIME(3) NULL,
  `updates` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `TrustIncident_status_idx` ON `TrustIncident`(`status`);
CREATE INDEX `TrustIncident_startedAt_idx` ON `TrustIncident`(`startedAt`);

CREATE TABLE `MarketApprovalRequest` (
  `id` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `marketplace` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `requestedByUserId` VARCHAR(191) NULL,
  `reviewedByUserId` VARCHAR(191) NULL,
  `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedAt` DATETIME(3) NULL,
  `decisionReason` TEXT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `MarketApprovalRequest_status_idx` ON `MarketApprovalRequest`(`status`);
CREATE INDEX `MarketApprovalRequest_marketplace_status_idx` ON `MarketApprovalRequest`(`marketplace`, `status`);
CREATE INDEX `MarketApprovalRequest_requestedByUserId_idx` ON `MarketApprovalRequest`(`requestedByUserId`);

ALTER TABLE `MarketApprovalRequest`
  ADD CONSTRAINT `MarketApprovalRequest_requestedByUserId_fkey` FOREIGN KEY (`requestedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MarketApprovalRequest`
  ADD CONSTRAINT `MarketApprovalRequest_reviewedByUserId_fkey` FOREIGN KEY (`reviewedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
