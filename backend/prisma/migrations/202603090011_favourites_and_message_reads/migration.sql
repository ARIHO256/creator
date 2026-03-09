ALTER TABLE `MessageThread`
  ADD COLUMN `lastMessageFromRole` VARCHAR(191) NULL,
  ADD COLUMN `lastReadAt` DATETIME(3) NULL;

CREATE TABLE `ListingFavorite` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `listingId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ListingFavorite_userId_listingId_key`(`userId`, `listingId`),
  INDEX `ListingFavorite_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `ListingFavorite_listingId_createdAt_idx`(`listingId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ListingFavorite`
  ADD CONSTRAINT `ListingFavorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ListingFavorite`
  ADD CONSTRAINT `ListingFavorite_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `MarketplaceListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
