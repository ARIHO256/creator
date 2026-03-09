DROP INDEX `SupportTicket_threadId_idx` ON `SupportTicket`;

CREATE UNIQUE INDEX `SupportTicket_threadId_key` ON `SupportTicket`(`threadId`);
