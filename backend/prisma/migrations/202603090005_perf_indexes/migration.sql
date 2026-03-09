CREATE INDEX `Order_channel_idx` ON `Order`(`channel`);
CREATE INDEX `Order_sellerId_channel_idx` ON `Order`(`sellerId`, `channel`);
CREATE INDEX `Order_channel_updatedAt_idx` ON `Order`(`channel`, `updatedAt`);

CREATE INDEX `MarketplaceListing_marketplace_idx` ON `MarketplaceListing`(`marketplace`);
CREATE INDEX `MarketplaceListing_marketplace_status_idx` ON `MarketplaceListing`(`marketplace`, `status`);

CREATE INDEX `Review_subjectUserId_status_createdAt_idx` ON `Review`(`subjectUserId`, `status`, `createdAt`);
CREATE INDEX `Review_requiresResponse_idx` ON `Review`(`requiresResponse`);
CREATE INDEX `Review_roleTarget_idx` ON `Review`(`roleTarget`);
CREATE INDEX `Review_itemType_idx` ON `Review`(`itemType`);
CREATE INDEX `Review_mldzSurface_idx` ON `Review`(`mldzSurface`);
