CREATE TABLE `CreatorFollow` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `creatorUserId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `CreatorFollow_sellerId_creatorUserId_key` ON `CreatorFollow`(`sellerId`, `creatorUserId`);
CREATE INDEX `CreatorFollow_creatorUserId_createdAt_idx` ON `CreatorFollow`(`creatorUserId`, `createdAt`);
CREATE INDEX `CreatorFollow_sellerId_createdAt_idx` ON `CreatorFollow`(`sellerId`, `createdAt`);

ALTER TABLE `CreatorFollow`
  ADD CONSTRAINT `CreatorFollow_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CreatorFollow`
  ADD CONSTRAINT `CreatorFollow_creatorUserId_fkey` FOREIGN KEY (`creatorUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
