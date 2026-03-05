import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateDealDto } from './dto/create-deal.dto.js';
import { UpdateDealDto } from './dto/update-deal.dto.js';
import { DealsService } from './deals.service.js';

@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.dealsService.list(user.sub);
  }

  @Get(':id')
  getOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.dealsService.getById(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() payload: CreateDealDto) {
    return this.dealsService.create(user.sub, payload);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateDealDto) {
    return this.dealsService.update(user.sub, id, payload);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.dealsService.remove(user.sub, id);
  }
}
