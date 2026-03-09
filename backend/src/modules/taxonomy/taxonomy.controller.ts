import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateTaxonomyCoverageDto } from './dto/create-taxonomy-coverage.dto.js';
import { CreateTaxonomyNodeDto } from './dto/create-taxonomy-node.dto.js';
import { CreateTaxonomyTreeDto } from './dto/create-taxonomy-tree.dto.js';
import { UpdateTaxonomyCoverageDto } from './dto/update-taxonomy-coverage.dto.js';
import { UpdateTaxonomyNodeDto } from './dto/update-taxonomy-node.dto.js';
import { UpdateTaxonomyTreeDto } from './dto/update-taxonomy-tree.dto.js';
import { TaxonomyService } from './taxonomy.service.js';

@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  @Public()
  @Get('trees')
  listTrees() {
    return this.taxonomyService.listTrees();
  }

  @Public()
  @Get('trees/:id/nodes')
  listTreeNodes(
    @Param('id') id: string,
    @Query('maxDepth') maxDepth?: string,
    @Query('includeInactive') includeInactive?: string
  ) {
    const depth = typeof maxDepth === 'string' && maxDepth.trim() !== '' ? Number(maxDepth) : undefined;
    const include = includeInactive === 'true' || includeInactive === '1';
    return this.taxonomyService.getTreeNodes(id, {
      maxDepth: Number.isFinite(depth) ? depth : undefined,
      includeInactive: include
    });
  }

  @Public()
  @Get('nodes/:id/children')
  listChildren(@Param('id') id: string) {
    return this.taxonomyService.listNodeChildren(id);
  }

  @Roles('ADMIN', 'SUPPORT')
  @Post('trees')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  createTree(@Body() payload: CreateTaxonomyTreeDto) {
    return this.taxonomyService.createTree(payload);
  }

  @Roles('ADMIN', 'SUPPORT')
  @Patch('trees/:id')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  updateTree(@Param('id') id: string, @Body() payload: UpdateTaxonomyTreeDto) {
    return this.taxonomyService.updateTree(id, payload);
  }

  @Roles('ADMIN', 'SUPPORT')
  @Post('nodes')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  createNode(@Body() payload: CreateTaxonomyNodeDto) {
    return this.taxonomyService.createNode(payload);
  }

  @Roles('ADMIN', 'SUPPORT')
  @Patch('nodes/:id')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  updateNode(@Param('id') id: string, @Body() payload: UpdateTaxonomyNodeDto) {
    return this.taxonomyService.updateNode(id, payload);
  }

  @Roles('SELLER', 'PROVIDER', 'ADMIN')
  @Get('coverage')
  listCoverage(@CurrentUser() user: RequestUser) {
    return this.taxonomyService.listCoverage(user.sub);
  }

  @Roles('SELLER', 'PROVIDER', 'ADMIN')
  @Post('coverage')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  addCoverage(@CurrentUser() user: RequestUser, @Body() payload: CreateTaxonomyCoverageDto) {
    return this.taxonomyService.addCoverage(user.sub, payload);
  }

  @Roles('SELLER', 'PROVIDER', 'ADMIN')
  @Patch('coverage/:id')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  updateCoverage(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateTaxonomyCoverageDto) {
    return this.taxonomyService.updateCoverage(user.sub, id, payload);
  }

  @Roles('SELLER', 'PROVIDER', 'ADMIN')
  @Delete('coverage/:id')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  removeCoverage(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.taxonomyService.removeCoverage(user.sub, id);
  }
}
