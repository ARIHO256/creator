CREATE TABLE `DashboardSnapshot` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `computedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `DashboardSnapshot_userId_role_key` (`userId`, `role`),
  INDEX `DashboardSnapshot_userId_role_idx` (`userId`, `role`),
  INDEX `DashboardSnapshot_computedAt_idx` (`computedAt`),
  INDEX `DashboardSnapshot_expiresAt_idx` (`expiresAt`),
  PRIMARY KEY (`id`),

  CONSTRAINT `DashboardSnapshot_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
