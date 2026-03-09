ALTER TABLE `SupportTicket`
  ADD COLUMN `assignedToUserId` VARCHAR(191) NULL,
  ADD COLUMN `threadId` VARCHAR(191) NULL,
  ADD COLUMN `assignedAt` DATETIME(3) NULL,
  ADD COLUMN `escalatedAt` DATETIME(3) NULL,
  ADD COLUMN `closedAt` DATETIME(3) NULL,
  ADD COLUMN `lastResponseAt` DATETIME(3) NULL;

CREATE INDEX `SupportTicket_assignedToUserId_status_idx` ON `SupportTicket`(`assignedToUserId`, `status`);
CREATE INDEX `SupportTicket_threadId_idx` ON `SupportTicket`(`threadId`);

ALTER TABLE `SupportTicket`
  ADD CONSTRAINT `SupportTicket_assignedToUserId_fkey` FOREIGN KEY (`assignedToUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SupportTicket`
  ADD CONSTRAINT `SupportTicket_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `MessageThread`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
