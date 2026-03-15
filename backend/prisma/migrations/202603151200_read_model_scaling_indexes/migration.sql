CREATE INDEX `Order_sellerId_status_updatedAt_idx`
ON `Order`(`sellerId`, `status`, `updatedAt`);

CREATE INDEX `Transaction_userId_status_createdAt_idx`
ON `Transaction`(`userId`, `status`, `createdAt`);

CREATE INDEX `Transaction_sellerId_status_createdAt_idx`
ON `Transaction`(`sellerId`, `status`, `createdAt`);

CREATE INDEX `Campaign_sellerId_status_updatedAt_idx`
ON `Campaign`(`sellerId`, `status`, `updatedAt`);

CREATE INDEX `Campaign_creatorId_status_updatedAt_idx`
ON `Campaign`(`creatorId`, `status`, `updatedAt`);

CREATE INDEX `Proposal_sellerId_status_updatedAt_idx`
ON `Proposal`(`sellerId`, `status`, `updatedAt`);

CREATE INDEX `Proposal_creatorId_status_updatedAt_idx`
ON `Proposal`(`creatorId`, `status`, `updatedAt`);

CREATE INDEX `AnalyticsEvent_userId_createdAt_eventType_idx`
ON `AnalyticsEvent`(`userId`, `createdAt`, `eventType`);

CREATE INDEX `ProviderQuote_userId_status_updatedAt_idx`
ON `ProviderQuote`(`userId`, `status`, `updatedAt`);

CREATE INDEX `ProviderBooking_userId_status_updatedAt_idx`
ON `ProviderBooking`(`userId`, `status`, `updatedAt`);

CREATE INDEX `ProviderConsultation_userId_status_updatedAt_idx`
ON `ProviderConsultation`(`userId`, `status`, `updatedAt`);

CREATE INDEX `LiveSession_userId_updatedAt_idx`
ON `LiveSession`(`userId`, `updatedAt`);

CREATE INDEX `LiveReplay_userId_updatedAt_idx`
ON `LiveReplay`(`userId`, `updatedAt`);

CREATE INDEX `Review_subjectUserId_subjectType_status_createdAt_idx`
ON `Review`(`subjectUserId`, `subjectType`, `status`, `createdAt`);
