import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module.js';
import { MarketplaceController } from './marketplace.controller.js';
import { MarketplaceService } from './marketplace.service.js';

@Module({
  imports: [SearchModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService]
})
export class MarketplaceModule {}
