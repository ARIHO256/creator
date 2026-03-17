CREATE TABLE `WorkspaceUserPreference` (
  `dbId` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `scopeRole` VARCHAR(191) NOT NULL,
  `locale` VARCHAR(191) NULL,
  `currency` VARCHAR(191) NULL,
  `timezone` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`dbId`),
  UNIQUE INDEX `WorkspaceUserPreference_workspaceId_userId_scopeRole_key`(`workspaceId`, `userId`, `scopeRole`),
  INDEX `WorkspaceUserPreference_workspaceId_updatedAt_idx`(`workspaceId`, `updatedAt`),
  INDEX `WorkspaceUserPreference_userId_updatedAt_idx`(`userId`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceUserPreference`
  ADD CONSTRAINT `WorkspaceUserPreference_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `WorkspaceUserPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `UserSecurityProfile` (
  `dbId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `twoFactor` BOOLEAN NOT NULL DEFAULT false,
  `twoFactorMethod` VARCHAR(191) NULL DEFAULT 'authenticator',
  `twoFactorConfig` JSON NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`dbId`),
  UNIQUE INDEX `UserSecurityProfile_userId_key`(`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserSecurityProfile`
  ADD CONSTRAINT `UserSecurityProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `UserSecuritySession` (
  `id` VARCHAR(191) NOT NULL,
  `profileDbId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `device` VARCHAR(191) NULL,
  `ip` VARCHAR(191) NULL,
  `lastActiveAt` DATETIME(3) NULL,
  `payload` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `UserSecuritySession_profileDbId_externalId_key`(`profileDbId`, `externalId`),
  INDEX `UserSecuritySession_profileDbId_lastActiveAt_idx`(`profileDbId`, `lastActiveAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserSecuritySession`
  ADD CONSTRAINT `UserSecuritySession_profileDbId_fkey` FOREIGN KEY (`profileDbId`) REFERENCES `UserSecurityProfile`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `UserSecurityPasskey` (
  `id` VARCHAR(191) NOT NULL,
  `profileDbId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `UserSecurityPasskey_profileDbId_externalId_key`(`profileDbId`, `externalId`),
  INDEX `UserSecurityPasskey_profileDbId_updatedAt_idx`(`profileDbId`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserSecurityPasskey`
  ADD CONSTRAINT `UserSecurityPasskey_profileDbId_fkey` FOREIGN KEY (`profileDbId`) REFERENCES `UserSecurityProfile`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `UserSecurityTrustedDevice` (
  `id` VARCHAR(191) NOT NULL,
  `profileDbId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `UserSecurityTrustedDevice_profileDbId_externalId_key`(`profileDbId`, `externalId`),
  INDEX `UserSecurityTrustedDevice_profileDbId_updatedAt_idx`(`profileDbId`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserSecurityTrustedDevice`
  ADD CONSTRAINT `UserSecurityTrustedDevice_profileDbId_fkey` FOREIGN KEY (`profileDbId`) REFERENCES `UserSecurityProfile`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `UserSecurityAlert` (
  `id` VARCHAR(191) NOT NULL,
  `profileDbId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `UserSecurityAlert_profileDbId_externalId_key`(`profileDbId`, `externalId`),
  INDEX `UserSecurityAlert_profileDbId_updatedAt_idx`(`profileDbId`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserSecurityAlert`
  ADD CONSTRAINT `UserSecurityAlert_profileDbId_fkey` FOREIGN KEY (`profileDbId`) REFERENCES `UserSecurityProfile`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `UserRememberedDevice` (
  `id` VARCHAR(191) NOT NULL,
  `profileDbId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `UserRememberedDevice_profileDbId_externalId_key`(`profileDbId`, `externalId`),
  INDEX `UserRememberedDevice_profileDbId_updatedAt_idx`(`profileDbId`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserRememberedDevice`
  ADD CONSTRAINT `UserRememberedDevice_profileDbId_fkey` FOREIGN KEY (`profileDbId`) REFERENCES `UserSecurityProfile`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE;
