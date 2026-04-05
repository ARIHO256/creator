-- Enforce necessary relational integrity for live builder sessions and campaign giveaways.
-- Keep this narrow: only add constraints where frontend flow relies on parent records.

-- Normalize orphaned builder session references before FK creation.
UPDATE `LiveBuilder` lb
LEFT JOIN `LiveSession` ls ON ls.`id` = lb.`sessionId`
SET lb.`sessionId` = NULL
WHERE lb.`sessionId` IS NOT NULL
  AND ls.`id` IS NULL;

-- Remove orphaned giveaways before FK creation.
DELETE lcg
FROM `LiveCampaignGiveaway` lcg
LEFT JOIN `Campaign` c ON c.`id` = lcg.`campaignId`
WHERE c.`id` IS NULL;

-- Ensure index exists for FK column.
SET @has_livebuilder_session_idx := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'LiveBuilder'
    AND index_name = 'LiveBuilder_sessionId_idx'
);
SET @sql := IF(
  @has_livebuilder_session_idx = 0,
  'CREATE INDEX `LiveBuilder_sessionId_idx` ON `LiveBuilder`(`sessionId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_livebuilder_session_fk := (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = DATABASE()
    AND constraint_name = 'LiveBuilder_sessionId_fkey'
    AND table_name = 'LiveBuilder'
);
SET @sql := IF(
  @has_livebuilder_session_fk = 0,
  'ALTER TABLE `LiveBuilder` ADD CONSTRAINT `LiveBuilder_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `LiveSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_livecampaigngiveaway_campaign_fk := (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = DATABASE()
    AND constraint_name = 'LiveCampaignGiveaway_campaignId_fkey'
    AND table_name = 'LiveCampaignGiveaway'
);
SET @sql := IF(
  @has_livecampaigngiveaway_campaign_fk = 0,
  'ALTER TABLE `LiveCampaignGiveaway` ADD CONSTRAINT `LiveCampaignGiveaway_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
