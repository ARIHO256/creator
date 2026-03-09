import { Module } from '@nestjs/common';
import { SellersModule } from '../sellers/sellers.module.js';
import { ProviderController } from './provider.controller.js';
import { ProviderService } from './provider.service.js';

@Module({
  imports: [SellersModule],
  controllers: [ProviderController],
  providers: [ProviderService]
})
export class ProviderModule {}
