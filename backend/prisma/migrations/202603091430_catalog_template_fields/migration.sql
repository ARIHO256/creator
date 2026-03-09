ALTER TABLE `CatalogTemplate`
  ADD COLUMN `category` VARCHAR(191) NULL,
  ADD COLUMN `notes` TEXT NULL,
  ADD COLUMN `language` VARCHAR(191) NULL,
  ADD COLUMN `attrCount` INT NOT NULL DEFAULT 0,
  ADD COLUMN `attributes` JSON NULL;

CREATE INDEX `CatalogTemplate_category_idx` ON `CatalogTemplate`(`category`);
CREATE INDEX `CatalogTemplate_language_idx` ON `CatalogTemplate`(`language`);
