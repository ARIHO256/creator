CREATE TABLE `SellerWarehouse` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NULL,
  `type` ENUM('WAREHOUSE', 'OFFICE', 'PICKUP') NOT NULL DEFAULT 'WAREHOUSE',
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `address` JSON NULL,
  `contact` JSON NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `SellerWarehouse_sellerId_idx`(`sellerId`),
  INDEX `SellerWarehouse_sellerId_status_idx`(`sellerId`, `status`),
  INDEX `SellerWarehouse_sellerId_isDefault_idx`(`sellerId`, `isDefault`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ShippingProfile` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `carrier` VARCHAR(191) NULL,
  `serviceLevel` VARCHAR(191) NULL,
  `handlingTimeDays` INTEGER NULL,
  `regions` JSON NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ShippingProfile_sellerId_idx`(`sellerId`),
  INDEX `ShippingProfile_sellerId_status_idx`(`sellerId`, `status`),
  INDEX `ShippingProfile_sellerId_isDefault_idx`(`sellerId`, `isDefault`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ShippingRate` (
  `id` VARCHAR(191) NOT NULL,
  `profileId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `rateType` ENUM('FLAT', 'WEIGHT', 'VALUE', 'REGION') NOT NULL DEFAULT 'FLAT',
  `minWeight` DOUBLE NULL,
  `maxWeight` DOUBLE NULL,
  `minOrderValue` DOUBLE NULL,
  `maxOrderValue` DOUBLE NULL,
  `price` DOUBLE NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `etaDays` INTEGER NULL,
  `regions` JSON NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ShippingRate_profileId_idx`(`profileId`),
  INDEX `ShippingRate_profileId_rateType_idx`(`profileId`, `rateType`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ListingInventorySlot` (
  `id` VARCHAR(191) NOT NULL,
  `listingId` VARCHAR(191) NOT NULL,
  `warehouseId` VARCHAR(191) NOT NULL,
  `sku` VARCHAR(191) NULL,
  `onHand` INTEGER NOT NULL DEFAULT 0,
  `reserved` INTEGER NOT NULL DEFAULT 0,
  `safetyStock` INTEGER NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ListingInventorySlot_listingId_warehouseId_key`(`listingId`, `warehouseId`),
  INDEX `ListingInventorySlot_warehouseId_idx`(`warehouseId`),
  INDEX `ListingInventorySlot_listingId_idx`(`listingId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InventoryAdjustment` (
  `id` VARCHAR(191) NOT NULL,
  `listingId` VARCHAR(191) NOT NULL,
  `warehouseId` VARCHAR(191) NULL,
  `createdByUserId` VARCHAR(191) NULL,
  `delta` INTEGER NOT NULL,
  `reason` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `InventoryAdjustment_listingId_createdAt_idx`(`listingId`, `createdAt`),
  INDEX `InventoryAdjustment_warehouseId_idx`(`warehouseId`),
  INDEX `InventoryAdjustment_createdByUserId_idx`(`createdByUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SellerDocument` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `listingId` VARCHAR(191) NULL,
  `type` VARCHAR(191) NOT NULL,
  `channel` VARCHAR(191) NULL,
  `regions` JSON NULL,
  `fileName` VARCHAR(191) NULL,
  `url` VARCHAR(191) NULL,
  `status` ENUM('UPLOADED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'MISSING') NOT NULL DEFAULT 'UPLOADED',
  `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `SellerDocument_sellerId_status_idx`(`sellerId`, `status`),
  INDEX `SellerDocument_listingId_idx`(`listingId`),
  INDEX `SellerDocument_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SellerExportJob` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `status` ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'QUEUED',
  `format` VARCHAR(191) NOT NULL DEFAULT 'CSV',
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  `fileUrl` VARCHAR(191) NULL,
  `filters` JSON NULL,
  `metadata` JSON NULL,
  INDEX `SellerExportJob_sellerId_status_idx`(`sellerId`, `status`),
  INDEX `SellerExportJob_requestedAt_idx`(`requestedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SellerReturn` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `status` ENUM('REQUESTED', 'APPROVED', 'RECEIVED', 'REFUNDED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
  `reason` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `approvedAt` DATETIME(3) NULL,
  `receivedAt` DATETIME(3) NULL,
  `refundedAt` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `SellerReturn_sellerId_status_idx`(`sellerId`, `status`),
  INDEX `SellerReturn_orderId_idx`(`orderId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SellerDispute` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `status` ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
  `reason` VARCHAR(191) NULL,
  `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `resolvedAt` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `SellerDispute_sellerId_status_idx`(`sellerId`, `status`),
  INDEX `SellerDispute_orderId_idx`(`orderId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SellerWarehouse`
  ADD CONSTRAINT `SellerWarehouse_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ShippingProfile`
  ADD CONSTRAINT `ShippingProfile_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ShippingRate`
  ADD CONSTRAINT `ShippingRate_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `ShippingProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ListingInventorySlot`
  ADD CONSTRAINT `ListingInventorySlot_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `MarketplaceListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ListingInventorySlot_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `SellerWarehouse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InventoryAdjustment`
  ADD CONSTRAINT `InventoryAdjustment_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `MarketplaceListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `InventoryAdjustment_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `SellerWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `InventoryAdjustment_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SellerDocument`
  ADD CONSTRAINT `SellerDocument_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `SellerDocument_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `MarketplaceListing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SellerExportJob`
  ADD CONSTRAINT `SellerExportJob_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SellerReturn`
  ADD CONSTRAINT `SellerReturn_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `SellerReturn_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SellerDispute`
  ADD CONSTRAINT `SellerDispute_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `SellerDispute_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
