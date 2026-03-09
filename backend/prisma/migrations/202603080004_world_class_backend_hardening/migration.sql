-- CreateTable
CREATE TABLE `UploadSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `purpose` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NULL,
    `sizeBytes` INTEGER NULL,
    `extension` VARCHAR(191) NULL,
    `checksum` VARCHAR(191) NULL,
    `storageProvider` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `visibility` VARCHAR(191) NOT NULL DEFAULT 'PRIVATE',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `expiresAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UploadSession_storageKey_key`(`storageKey`),
    INDEX `UploadSession_userId_status_createdAt_idx`(`userId`, `status`, `createdAt`),
    INDEX `UploadSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UploadSession` ADD CONSTRAINT `UploadSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
