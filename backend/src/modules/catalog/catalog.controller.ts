import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CatalogService } from './catalog.service.js';
import { CatalogImportJobDto } from './dto/catalog-import-job.dto.js';
import { CatalogMediaQueryDto } from './dto/catalog-media-query.dto.js';
import { CatalogPresetQueryDto } from './dto/catalog-preset-query.dto.js';
import { CatalogTemplateValidateDto } from './dto/catalog-template-validate.dto.js';
import { ImportCatalogTemplatesDto } from './dto/catalog-templates-import.dto.js';
import { CatalogTemplatesQueryDto } from './dto/catalog-templates-query.dto.js';
import { CreateCatalogPresetDto } from './dto/create-catalog-preset.dto.js';
import { CreateCatalogTemplateDto } from './dto/create-catalog-template.dto.js';
import { UpdateCatalogPresetDto } from './dto/update-catalog-preset.dto.js';
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

  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Delete('catalog/templates/:id')
  deleteTemplate(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.deleteTemplate(user.sub, id);
  }

  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Post('catalog/templates/import')
  importTemplates(@CurrentUser() user: RequestUser, @Body() body: ImportCatalogTemplatesDto) {
    return this.service.importTemplates(user.sub, body);
  }

  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Post('catalog/templates/validate')
  validateTemplates(@CurrentUser() user: RequestUser, @Body() body: CatalogTemplateValidateDto) {
    return this.service.validateTemplates(user.sub, body);
  }

  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Post('catalog/templates/import/jobs')
  createImportJob(@CurrentUser() user: RequestUser, @Body() body: CatalogImportJobDto) {
    return this.service.createImportJob(user.sub, body);
  }

  @Get('catalog/templates/import/jobs/:id')
  importJob(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.importJob(user.sub, id);
  }

  @Get('catalog/media-library')
  mediaLibrary(@CurrentUser() user: RequestUser, @Query() query: CatalogMediaQueryDto) {
    return this.service.mediaLibrary(user.sub, query);
  }

  @Get('catalog/presets')
  presets(@CurrentUser() user: RequestUser, @Query() query: CatalogPresetQueryDto) {
    return this.service.presets(user.sub, query);
  }

  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Post('catalog/presets')
  createPreset(@CurrentUser() user: RequestUser, @Body() body: CreateCatalogPresetDto) {
    return this.service.createPreset(user.sub, body);
  }

  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Patch('catalog/presets/:id')
  updatePreset(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: UpdateCatalogPresetDto) {
    return this.service.updatePreset(user.sub, id, body);
  }

  @Post('catalog/presets/:id/export')
  exportPreset(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.exportPreset(user.sub, id);
  }

  @Post('catalog/presets/:id/delete')
  deletePreset(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.deletePreset(user.sub, id);
  }
}
