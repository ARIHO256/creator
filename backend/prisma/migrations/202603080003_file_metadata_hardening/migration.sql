-- AlterTable
ALTER TABLE `DeliverableAsset` ADD COLUMN `checksum` VARCHAR(191) NULL,
    ADD COLUMN `extension` VARCHAR(191) NULL,
    ADD COLUMN `mimeType` VARCHAR(191) NULL,
    ADD COLUMN `sizeBytes` INTEGER NULL,
    ADD COLUMN `storageKey` VARCHAR(191) NULL,
    ADD COLUMN `storageProvider` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `MediaAsset` ADD COLUMN `checksum` VARCHAR(191) NULL,
    ADD COLUMN `extension` VARCHAR(191) NULL,
    ADD COLUMN `isPublic` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `mimeType` VARCHAR(191) NULL,
    ADD COLUMN `sizeBytes` INTEGER NULL,
    ADD COLUMN `storageKey` VARCHAR(191) NULL,
    ADD COLUMN `storageProvider` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `TaskAttachment` ADD COLUMN `checksum` VARCHAR(191) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `mimeType` VARCHAR(191) NULL,
    ADD COLUMN `sizeBytes` INTEGER NULL,
    ADD COLUMN `storageKey` VARCHAR(191) NULL,
    ADD COLUMN `storageProvider` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `DeliverableAsset_storageKey_idx` ON `DeliverableAsset`(`storageKey`);

-- CreateIndex
CREATE INDEX `MediaAsset_userId_createdAt_idx` ON `MediaAsset`(`userId`, `createdAt`);

-- CreateIndex
CREATE INDEX `MediaAsset_storageKey_idx` ON `MediaAsset`(`storageKey`);

-- CreateIndex
CREATE INDEX `TaskAttachment_taskId_createdAt_idx` ON `TaskAttachment`(`taskId`, `createdAt`);

-- CreateIndex
CREATE INDEX `TaskAttachment_storageKey_idx` ON `TaskAttachment`(`storageKey`);
