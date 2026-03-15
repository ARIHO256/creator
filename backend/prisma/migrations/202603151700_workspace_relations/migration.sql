CREATE TABLE `Workspace` (
  `id` VARCHAR(191) NOT NULL,
  `ownerUserId` VARCHAR(191) NOT NULL,
  `require2FA` BOOLEAN NOT NULL DEFAULT true,
  `allowExternalInvites` BOOLEAN NOT NULL DEFAULT false,
  `supplierGuestExpiryHours` INTEGER NOT NULL DEFAULT 24,
  `inviteDomainAllowlist` JSON NULL,
  `requireApprovalForPayouts` BOOLEAN NOT NULL DEFAULT true,
  `payoutApprovalThresholdUsd` INTEGER NOT NULL DEFAULT 500,
  `restrictSensitiveExports` BOOLEAN NOT NULL DEFAULT true,
  `sessionTimeoutMins` INTEGER NOT NULL DEFAULT 60,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Workspace_ownerUserId_key`(`ownerUserId`),
  INDEX `Workspace_updatedAt_idx`(`updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Workspace`
  ADD CONSTRAINT `Workspace_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspaceRole` (
  `dbId` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `badge` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `permissions` JSON NULL,
  `isSystem` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`dbId`),
  UNIQUE INDEX `WorkspaceRole_workspaceId_key_key`(`workspaceId`, `key`),
  UNIQUE INDEX `WorkspaceRole_workspaceId_name_key`(`workspaceId`, `name`),
  INDEX `WorkspaceRole_workspaceId_updatedAt_idx`(`workspaceId`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceRole`
  ADD CONSTRAINT `WorkspaceRole_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspaceMember` (
  `dbId` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `roleDbId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'active',
  `seat` VARCHAR(191) NULL,
  `invitedAt` DATETIME(3) NULL,
  `joinedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`dbId`),
  UNIQUE INDEX `WorkspaceMember_workspaceId_externalId_key`(`workspaceId`, `externalId`),
  UNIQUE INDEX `WorkspaceMember_workspaceId_email_key`(`workspaceId`, `email`),
  INDEX `WorkspaceMember_workspaceId_status_updatedAt_idx`(`workspaceId`, `status`, `updatedAt`),
  INDEX `WorkspaceMember_userId_idx`(`userId`),
  INDEX `WorkspaceMember_roleDbId_idx`(`roleDbId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceMember`
  ADD CONSTRAINT `WorkspaceMember_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `WorkspaceMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `WorkspaceMember_roleDbId_fkey` FOREIGN KEY (`roleDbId`) REFERENCES `WorkspaceRole`(`dbId`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `WorkspaceInvite` (
  `dbId` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `roleDbId` VARCHAR(191) NOT NULL,
  `memberDbId` VARCHAR(191) NULL,
  `invitedByUserId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'invited',
  `seat` VARCHAR(191) NULL,
  `acceptedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`dbId`),
  UNIQUE INDEX `WorkspaceInvite_workspaceId_email_roleDbId_key`(`workspaceId`, `email`, `roleDbId`),
  INDEX `WorkspaceInvite_workspaceId_status_updatedAt_idx`(`workspaceId`, `status`, `updatedAt`),
  INDEX `WorkspaceInvite_memberDbId_idx`(`memberDbId`),
  INDEX `WorkspaceInvite_invitedByUserId_idx`(`invitedByUserId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceInvite`
  ADD CONSTRAINT `WorkspaceInvite_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `WorkspaceInvite_roleDbId_fkey` FOREIGN KEY (`roleDbId`) REFERENCES `WorkspaceRole`(`dbId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `WorkspaceInvite_memberDbId_fkey` FOREIGN KEY (`memberDbId`) REFERENCES `WorkspaceMember`(`dbId`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `WorkspaceInvite_invitedByUserId_fkey` FOREIGN KEY (`invitedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `WorkspaceCrewSession` (
  `dbId` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `sessionKey` VARCHAR(191) NOT NULL,
  `payload` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`dbId`),
  UNIQUE INDEX `WorkspaceCrewSession_workspaceId_sessionKey_key`(`workspaceId`, `sessionKey`),
  INDEX `WorkspaceCrewSession_workspaceId_updatedAt_idx`(`workspaceId`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceCrewSession`
  ADD CONSTRAINT `WorkspaceCrewSession_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspaceCrewAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `crewSessionDbId` VARCHAR(191) NOT NULL,
  `memberDbId` VARCHAR(191) NULL,
  `assignmentRole` VARCHAR(191) NULL,
  `payload` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `WorkspaceCrewAssignment_crewSessionDbId_updatedAt_idx`(`crewSessionDbId`, `updatedAt`),
  INDEX `WorkspaceCrewAssignment_memberDbId_idx`(`memberDbId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceCrewAssignment`
  ADD CONSTRAINT `WorkspaceCrewAssignment_crewSessionDbId_fkey` FOREIGN KEY (`crewSessionDbId`) REFERENCES `WorkspaceCrewSession`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `WorkspaceCrewAssignment_memberDbId_fkey` FOREIGN KEY (`memberDbId`) REFERENCES `WorkspaceMember`(`dbId`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `WorkspaceSavedViewGroup` (
  `dbId` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `scopeRole` VARCHAR(191) NOT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`dbId`),
  UNIQUE INDEX `WorkspaceSavedViewGroup_workspaceId_scopeRole_key`(`workspaceId`, `scopeRole`),
  INDEX `WorkspaceSavedViewGroup_workspaceId_updatedAt_idx`(`workspaceId`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceSavedViewGroup`
  ADD CONSTRAINT `WorkspaceSavedViewGroup_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspaceSavedView` (
  `id` VARCHAR(191) NOT NULL,
  `groupDbId` VARCHAR(191) NOT NULL,
  `createdByUserId` VARCHAR(191) NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WorkspaceSavedView_groupDbId_externalId_key`(`groupDbId`, `externalId`),
  INDEX `WorkspaceSavedView_groupDbId_position_idx`(`groupDbId`, `position`),
  INDEX `WorkspaceSavedView_createdByUserId_idx`(`createdByUserId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceSavedView`
  ADD CONSTRAINT `WorkspaceSavedView_groupDbId_fkey` FOREIGN KEY (`groupDbId`) REFERENCES `WorkspaceSavedViewGroup`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `WorkspaceSavedView_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `WorkspaceHelpLink` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NULL,
  `category` VARCHAR(191) NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WorkspaceHelpLink_workspaceId_externalId_key`(`workspaceId`, `externalId`),
  INDEX `WorkspaceHelpLink_workspaceId_position_idx`(`workspaceId`, `position`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceHelpLink`
  ADD CONSTRAINT `WorkspaceHelpLink_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspaceStatusService` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NULL,
  `status` VARCHAR(191) NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WorkspaceStatusService_workspaceId_externalId_key`(`workspaceId`, `externalId`),
  INDEX `WorkspaceStatusService_workspaceId_position_idx`(`workspaceId`, `position`),
  INDEX `WorkspaceStatusService_workspaceId_status_updatedAt_idx`(`workspaceId`, `status`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceStatusService`
  ADD CONSTRAINT `WorkspaceStatusService_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspaceNotificationPreference` (
  `dbId` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `scopeRole` VARCHAR(191) NOT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`dbId`),
  UNIQUE INDEX `WorkspaceNotificationPreference_workspaceId_userId_scopeRole_key`(`workspaceId`, `userId`, `scopeRole`),
  INDEX `WorkspaceNotificationPreference_workspaceId_updatedAt_idx`(`workspaceId`, `updatedAt`),
  INDEX `WorkspaceNotificationPreference_userId_updatedAt_idx`(`userId`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceNotificationPreference`
  ADD CONSTRAINT `WorkspaceNotificationPreference_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `WorkspaceNotificationPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspaceNotificationWatch` (
  `id` VARCHAR(191) NOT NULL,
  `preferenceDbId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `channel` VARCHAR(191) NULL,
  `enabled` BOOLEAN NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WorkspaceNotificationWatch_preferenceDbId_externalId_key`(`preferenceDbId`, `externalId`),
  INDEX `WorkspaceNotificationWatch_preferenceDbId_position_idx`(`preferenceDbId`, `position`),
  INDEX `WorkspaceNotificationWatch_preferenceDbId_channel_idx`(`preferenceDbId`, `channel`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceNotificationWatch`
  ADD CONSTRAINT `WorkspaceNotificationWatch_preferenceDbId_fkey` FOREIGN KEY (`preferenceDbId`) REFERENCES `WorkspaceNotificationPreference`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE;
