CREATE TABLE `WorkspacePayoutSettings` (
  `dbId` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`dbId`),
  UNIQUE INDEX `WorkspacePayoutSettings_workspaceId_key`(`workspaceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspacePayoutSettings`
  ADD CONSTRAINT `WorkspacePayoutSettings_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspacePayoutMethod` (
  `id` VARCHAR(191) NOT NULL,
  `settingsDbId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NULL,
  `currency` VARCHAR(191) NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `position` INTEGER NOT NULL DEFAULT 0,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WorkspacePayoutMethod_settingsDbId_externalId_key`(`settingsDbId`, `externalId`),
  INDEX `WorkspacePayoutMethod_settingsDbId_position_idx`(`settingsDbId`, `position`),
  INDEX `WorkspacePayoutMethod_settingsDbId_isDefault_idx`(`settingsDbId`, `isDefault`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspacePayoutMethod`
  ADD CONSTRAINT `WorkspacePayoutMethod_settingsDbId_fkey` FOREIGN KEY (`settingsDbId`) REFERENCES `WorkspacePayoutSettings`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspaceIntegrationSettings` (
  `dbId` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`dbId`),
  UNIQUE INDEX `WorkspaceIntegrationSettings_workspaceId_key`(`workspaceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceIntegrationSettings`
  ADD CONSTRAINT `WorkspaceIntegrationSettings_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspaceIntegrationConnection` (
  `id` VARCHAR(191) NOT NULL,
  `settingsDbId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NULL,
  `provider` VARCHAR(191) NULL,
  `status` VARCHAR(191) NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WorkspaceIntegrationConnection_settingsDbId_externalId_key`(`settingsDbId`, `externalId`),
  INDEX `WorkspaceIntegrationConnection_settingsDbId_position_idx`(`settingsDbId`, `position`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceIntegrationConnection`
  ADD CONSTRAINT `WorkspaceIntegrationConnection_settingsDbId_fkey` FOREIGN KEY (`settingsDbId`) REFERENCES `WorkspaceIntegrationSettings`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspaceIntegrationWebhook` (
  `id` VARCHAR(191) NOT NULL,
  `settingsDbId` VARCHAR(191) NOT NULL,
  `integrationDbId` VARCHAR(191) NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WorkspaceIntegrationWebhook_settingsDbId_externalId_key`(`settingsDbId`, `externalId`),
  INDEX `WorkspaceIntegrationWebhook_settingsDbId_position_idx`(`settingsDbId`, `position`),
  INDEX `WorkspaceIntegrationWebhook_integrationDbId_idx`(`integrationDbId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceIntegrationWebhook`
  ADD CONSTRAINT `WorkspaceIntegrationWebhook_settingsDbId_fkey` FOREIGN KEY (`settingsDbId`) REFERENCES `WorkspaceIntegrationSettings`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `WorkspaceIntegrationWebhook_integrationDbId_fkey` FOREIGN KEY (`integrationDbId`) REFERENCES `WorkspaceIntegrationConnection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `WorkspaceTaxSettings` (
  `dbId` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`dbId`),
  UNIQUE INDEX `WorkspaceTaxSettings_workspaceId_key`(`workspaceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceTaxSettings`
  ADD CONSTRAINT `WorkspaceTaxSettings_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspaceTaxProfile` (
  `id` VARCHAR(191) NOT NULL,
  `settingsDbId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `profileName` VARCHAR(191) NULL,
  `country` VARCHAR(191) NULL,
  `vatId` VARCHAR(191) NULL,
  `status` VARCHAR(191) NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `position` INTEGER NOT NULL DEFAULT 0,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WorkspaceTaxProfile_settingsDbId_externalId_key`(`settingsDbId`, `externalId`),
  INDEX `WorkspaceTaxProfile_settingsDbId_position_idx`(`settingsDbId`, `position`),
  INDEX `WorkspaceTaxProfile_settingsDbId_isDefault_idx`(`settingsDbId`, `isDefault`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceTaxProfile`
  ADD CONSTRAINT `WorkspaceTaxProfile_settingsDbId_fkey` FOREIGN KEY (`settingsDbId`) REFERENCES `WorkspaceTaxSettings`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspaceTaxReport` (
  `id` VARCHAR(191) NOT NULL,
  `settingsDbId` VARCHAR(191) NOT NULL,
  `profileDbId` VARCHAR(191) NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NULL,
  `periodStart` DATETIME(3) NULL,
  `periodEnd` DATETIME(3) NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WorkspaceTaxReport_settingsDbId_externalId_key`(`settingsDbId`, `externalId`),
  INDEX `WorkspaceTaxReport_settingsDbId_position_idx`(`settingsDbId`, `position`),
  INDEX `WorkspaceTaxReport_profileDbId_idx`(`profileDbId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceTaxReport`
  ADD CONSTRAINT `WorkspaceTaxReport_settingsDbId_fkey` FOREIGN KEY (`settingsDbId`) REFERENCES `WorkspaceTaxSettings`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `WorkspaceTaxReport_profileDbId_fkey` FOREIGN KEY (`profileDbId`) REFERENCES `WorkspaceTaxProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `WorkspaceKycProfile` (
  `dbId` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`dbId`),
  UNIQUE INDEX `WorkspaceKycProfile_workspaceId_key`(`workspaceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceKycProfile`
  ADD CONSTRAINT `WorkspaceKycProfile_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `WorkspaceKycDocument` (
  `id` VARCHAR(191) NOT NULL,
  `kycProfileDbId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NULL,
  `status` VARCHAR(191) NULL,
  `uploadedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `payload` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WorkspaceKycDocument_kycProfileDbId_externalId_key`(`kycProfileDbId`, `externalId`),
  INDEX `WorkspaceKycDocument_kycProfileDbId_position_idx`(`kycProfileDbId`, `position`),
  INDEX `WorkspaceKycDocument_expiresAt_idx`(`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkspaceKycDocument`
  ADD CONSTRAINT `WorkspaceKycDocument_kycProfileDbId_fkey` FOREIGN KEY (`kycProfileDbId`) REFERENCES `WorkspaceKycProfile`(`dbId`) ON DELETE CASCADE ON UPDATE CASCADE;
