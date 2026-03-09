ALTER TABLE `MarketApprovalRequest`
  ADD COLUMN `slaDueAt` DATETIME(3) NULL,
  ADD COLUMN `slaStatus` VARCHAR(191) NOT NULL DEFAULT 'ON_TIME',
  ADD COLUMN `escalatedAt` DATETIME(3) NULL;

CREATE INDEX `MarketApprovalRequest_slaDueAt_idx` ON `MarketApprovalRequest`(`slaDueAt`);
