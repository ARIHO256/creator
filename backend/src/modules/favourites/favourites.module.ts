import { Module } from '@nestjs/common';
import { PrismaModule } from '../../platform/prisma/prisma.module.js';
import { FavouritesController } from './favourites.controller.js';
import { FavouritesService } from './favourites.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [FavouritesController],
  providers: [FavouritesService]
})
export class FavouritesModule {}
