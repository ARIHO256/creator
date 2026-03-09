CREATE TABLE `AuditEvent` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `role` VARCHAR(191) NULL,
  `action` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NULL,
  `entityId` VARCHAR(191) NULL,
  `route` VARCHAR(191) NOT NULL,
  `method` VARCHAR(191) NOT NULL,
  `statusCode` INT NOT NULL,
  `requestId` VARCHAR(191) NULL,
  `ip` VARCHAR(191) NULL,
  `userAgent` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `AuditEvent_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `AuditEvent_action_createdAt_idx`(`action`, `createdAt`),
  INDEX `AuditEvent_entityType_entityId_idx`(`entityType`, `entityId`),
  INDEX `AuditEvent_route_createdAt_idx`(`route`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AuditEvent`
  ADD CONSTRAINT `AuditEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
