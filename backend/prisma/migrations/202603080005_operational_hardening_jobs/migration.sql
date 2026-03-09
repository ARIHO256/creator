-- CreateTable
CREATE TABLE `BackgroundJob` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `queue` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `dedupeKey` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL DEFAULT 100,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 5,
    `runAfter` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lockedAt` DATETIME(3) NULL,
    `lockedBy` VARCHAR(191) NULL,
    `correlationId` VARCHAR(191) NULL,
    `payload` JSON NOT NULL,
    `result` JSON NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BackgroundJob_dedupeKey_key`(`dedupeKey`),
    INDEX `BackgroundJob_queue_status_runAfter_priority_idx`(`queue`, `status`, `runAfter`, `priority`),
    INDEX `BackgroundJob_status_runAfter_idx`(`status`, `runAfter`),
    INDEX `BackgroundJob_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `BackgroundJob_correlationId_idx`(`correlationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BackgroundJob` ADD CONSTRAINT `BackgroundJob_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
