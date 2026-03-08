CREATE TABLE `Storefront` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `tagline` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `heroTitle` VARCHAR(191) NULL,
  `heroSubtitle` VARCHAR(191) NULL,
  `heroMediaUrl` VARCHAR(191) NULL,
  `logoUrl` VARCHAR(191) NULL,
  `coverUrl` VARCHAR(191) NULL,
  `theme` JSON NULL,
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Storefront_sellerId_key`(`sellerId`),
  UNIQUE INDEX `Storefront_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TaxonomyTree` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `TaxonomyTree_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TaxonomyNode` (
  `id` VARCHAR(191) NOT NULL,
  `treeId` VARCHAR(191) NOT NULL,
  `parentId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `kind` ENUM('MARKETPLACE', 'FAMILY', 'CATEGORY', 'SUBCATEGORY', 'LINE') NOT NULL DEFAULT 'CATEGORY',
  `description` TEXT NULL,
  `path` VARCHAR(191) NOT NULL,
  `depth` INTEGER NOT NULL DEFAULT 0,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `TaxonomyNode_treeId_slug_key`(`treeId`, `slug`),
  UNIQUE INDEX `TaxonomyNode_treeId_path_key`(`treeId`, `path`),
  INDEX `TaxonomyNode_treeId_idx`(`treeId`),
  INDEX `TaxonomyNode_parentId_idx`(`parentId`),
  INDEX `TaxonomyNode_treeId_parentId_idx`(`treeId`, `parentId`),
  INDEX `TaxonomyNode_treeId_path_idx`(`treeId`, `path`),
  INDEX `TaxonomyNode_treeId_kind_idx`(`treeId`, `kind`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SellerTaxonomyCoverage` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `taxonomyNodeId` VARCHAR(191) NOT NULL,
  `status` ENUM('ACTIVE', 'SUSPENDED', 'REMOVED') NOT NULL DEFAULT 'ACTIVE',
  `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `removedAt` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `metadata` JSON NULL,
  `pathSnapshot` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SellerTaxonomyCoverage_sellerId_taxonomyNodeId_key`(`sellerId`, `taxonomyNodeId`),
  INDEX `SellerTaxonomyCoverage_sellerId_status_idx`(`sellerId`, `status`),
  INDEX `SellerTaxonomyCoverage_taxonomyNodeId_idx`(`taxonomyNodeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ListingTaxonomyLink` (
  `id` VARCHAR(191) NOT NULL,
  `listingId` VARCHAR(191) NOT NULL,
  `taxonomyNodeId` VARCHAR(191) NOT NULL,
  `isPrimary` BOOLEAN NOT NULL DEFAULT false,
  `pathSnapshot` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ListingTaxonomyLink_listingId_taxonomyNodeId_key`(`listingId`, `taxonomyNodeId`),
  INDEX `ListingTaxonomyLink_listingId_isPrimary_idx`(`listingId`, `isPrimary`),
  INDEX `ListingTaxonomyLink_taxonomyNodeId_idx`(`taxonomyNodeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Storefront`
  ADD CONSTRAINT `Storefront_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TaxonomyNode`
  ADD CONSTRAINT `TaxonomyNode_treeId_fkey` FOREIGN KEY (`treeId`) REFERENCES `TaxonomyTree`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TaxonomyNode_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `TaxonomyNode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SellerTaxonomyCoverage`
  ADD CONSTRAINT `SellerTaxonomyCoverage_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `SellerTaxonomyCoverage_taxonomyNodeId_fkey` FOREIGN KEY (`taxonomyNodeId`) REFERENCES `TaxonomyNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ListingTaxonomyLink`
  ADD CONSTRAINT `ListingTaxonomyLink_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `MarketplaceListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ListingTaxonomyLink_taxonomyNodeId_fkey` FOREIGN KEY (`taxonomyNodeId`) REFERENCES `TaxonomyNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
