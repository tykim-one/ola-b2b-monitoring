import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FiltersService } from './filters.service';
import { CreateFilterDto } from './dto/create-filter.dto';
import { UpdateFilterDto } from './dto/update-filter.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Admin - Filters')
@ApiBearerAuth()
@Controller('api/admin/filters')
export class FiltersController {
  constructor(private readonly filtersService: FiltersService) {}

  @Get()
  @Permissions('filters:read')
  @ApiOperation({ summary: 'List all saved filters for current user' })
  @ApiResponse({ status: 200, description: 'Filters retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findByUser(@CurrentUser('sub') userId: string) {
    return this.filtersService.findByUser(userId);
  }

  @Get(':id')
  @Permissions('filters:read')
  @ApiOperation({ summary: 'Get specific filter by ID' })
  @ApiResponse({ status: 200, description: 'Filter retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Filter not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not filter owner' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filtersService.findById(id, userId);
  }

  @Post()
  @Permissions('filters:write')
  @ApiOperation({ summary: 'Create new saved filter' })
  @ApiResponse({ status: 201, description: 'Filter created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() createFilterDto: CreateFilterDto,
  ) {
    return this.filtersService.create(userId, createFilterDto);
  }

  @Put(':id')
  @Permissions('filters:write')
  @ApiOperation({ summary: 'Update saved filter' })
  @ApiResponse({ status: 200, description: 'Filter updated successfully' })
  @ApiResponse({ status: 404, description: 'Filter not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not filter owner' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() updateFilterDto: UpdateFilterDto,
  ) {
    return this.filtersService.update(id, userId, updateFilterDto);
  }

  @Delete(':id')
  @Permissions('filters:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete saved filter' })
  @ApiResponse({ status: 204, description: 'Filter deleted successfully' })
  @ApiResponse({ status: 404, description: 'Filter not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not filter owner' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filtersService.delete(id, userId);
  }

  @Post(':id/set-default')
  @Permissions('filters:write')
  @ApiOperation({ summary: 'Set filter as default for user' })
  @ApiResponse({
    status: 200,
    description: 'Filter set as default successfully',
  })
  @ApiResponse({ status: 404, description: 'Filter not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not filter owner' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async setDefault(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filtersService.setDefault(id, userId);
  }
}
