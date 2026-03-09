import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CatalogService } from './catalog.service.js';
import { CatalogMediaQueryDto } from './dto/catalog-media-query.dto.js';
import { ImportCatalogTemplatesDto } from './dto/catalog-templates-import.dto.js';
import { CatalogTemplatesQueryDto } from './dto/catalog-templates-query.dto.js';
import { CreateCatalogTemplateDto } from './dto/create-catalog-template.dto.js';
import { UpdateCatalogTemplateDto } from './dto/update-catalog-template.dto.js';

@Controller()
@Roles('SELLER', 'PROVIDER', 'ADMIN')
export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  @Get('catalog/templates')
  templates(@CurrentUser() user: RequestUser, @Query() query: CatalogTemplatesQueryDto) {
    return this.service.templates(user.sub, query);
  }

  @Get('catalog/templates/export')
  exportTemplates(@CurrentUser() user: RequestUser, @Query() query: CatalogTemplatesQueryDto) {
    return this.service.exportTemplates(user.sub, query);
  }

  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('catalog/templates')
  createTemplate(@CurrentUser() user: RequestUser, @Body() body: CreateCatalogTemplateDto) {
    return this.service.createTemplate(user.sub, body);
  }

  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Patch('catalog/templates/:id')
  updateTemplate(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: UpdateCatalogTemplateDto) {
    return this.service.updateTemplate(user.sub, id, body);
  }

  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Post('catalog/templates/import')
  importTemplates(@CurrentUser() user: RequestUser, @Body() body: ImportCatalogTemplatesDto) {
    return this.service.importTemplates(user.sub, body);
  }

  @Get('catalog/media-library')
  mediaLibrary(@CurrentUser() user: RequestUser, @Query() query: CatalogMediaQueryDto) {
    return this.service.mediaLibrary(user.sub, query);
  }
}
