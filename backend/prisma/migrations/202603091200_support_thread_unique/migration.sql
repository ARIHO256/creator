ALTER TABLE `SupportTicket`
  DROP FOREIGN KEY `SupportTicket_threadId_fkey`;

DROP INDEX `SupportTicket_threadId_idx` ON `SupportTicket`;

CREATE UNIQUE INDEX `SupportTicket_threadId_key` ON `SupportTicket`(`threadId`);

ALTER TABLE `SupportTicket`
  ADD CONSTRAINT `SupportTicket_threadId_fkey`
    FOREIGN KEY (`threadId`) REFERENCES `MessageThread`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
