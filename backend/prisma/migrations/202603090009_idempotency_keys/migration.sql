CREATE TABLE `IdempotencyKey` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `method` VARCHAR(32) NOT NULL,
  `route` VARCHAR(191) NOT NULL,
  `requestHash` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `IdempotencyKey_userId_key_key`(`userId`, `key`),
  INDEX `IdempotencyKey_expiresAt_idx`(`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `IdempotencyKey`
  ADD CONSTRAINT `IdempotencyKey_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
