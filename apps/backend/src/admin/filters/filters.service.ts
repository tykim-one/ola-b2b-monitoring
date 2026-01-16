import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateFilterDto } from './dto/create-filter.dto';
import { UpdateFilterDto } from './dto/update-filter.dto';
import type { FilterCriteria } from '@ola/shared-types';

@Injectable()
export class FiltersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string) {
    const filters = await this.prisma.savedFilter.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    // Parse JSON criteria strings back to objects
    return filters.map((filter: any) => ({
      id: filter.id,
      userId: filter.userId,
      name: filter.name,
      description: filter.description,
      criteria: JSON.parse(filter.criteria) as FilterCriteria,
      isDefault: filter.isDefault,
      createdAt: filter.createdAt,
      updatedAt: filter.updatedAt,
    }));
  }

  async findById(id: string, userId: string) {
    const filter = await this.prisma.savedFilter.findUnique({
      where: { id },
    });

    if (!filter) {
      throw new NotFoundException(`Filter with ID ${id} not found`);
    }

    // Verify ownership
    if (filter.userId !== userId) {
      throw new ForbiddenException('You do not have access to this filter');
    }

    // Parse JSON criteria string back to object
    return {
      id: filter.id,
      userId: filter.userId,
      name: filter.name,
      description: filter.description,
      criteria: JSON.parse(filter.criteria) as FilterCriteria,
      isDefault: filter.isDefault,
      createdAt: filter.createdAt,
      updatedAt: filter.updatedAt,
    };
  }

  async create(userId: string, createFilterDto: CreateFilterDto) {
    // If setting as default, unset other defaults for this user
    if (createFilterDto.isDefault) {
      await this.prisma.savedFilter.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create filter with criteria as JSON string
    const filter = await this.prisma.savedFilter.create({
      data: {
        userId,
        name: createFilterDto.name,
        description: createFilterDto.description,
        criteria: JSON.stringify(createFilterDto.criteria),
        isDefault: createFilterDto.isDefault ?? false,
      },
    });

    // Parse JSON criteria string back to object
    return {
      id: filter.id,
      userId: filter.userId,
      name: filter.name,
      description: filter.description,
      criteria: JSON.parse(filter.criteria) as FilterCriteria,
      isDefault: filter.isDefault,
      createdAt: filter.createdAt,
      updatedAt: filter.updatedAt,
    };
  }

  async update(id: string, userId: string, updateFilterDto: UpdateFilterDto) {
    // Check if filter exists and user owns it
    const existingFilter = await this.prisma.savedFilter.findUnique({
      where: { id },
    });

    if (!existingFilter) {
      throw new NotFoundException(`Filter with ID ${id} not found`);
    }

    if (existingFilter.userId !== userId) {
      throw new ForbiddenException('You do not have access to this filter');
    }

    // If setting as default, unset other defaults for this user
    if (updateFilterDto.isDefault) {
      await this.prisma.savedFilter.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // Update filter
    const updatedFilter = await this.prisma.savedFilter.update({
      where: { id },
      data: {
        name: updateFilterDto.name,
        description: updateFilterDto.description,
        ...(updateFilterDto.criteria && {
          criteria: JSON.stringify(updateFilterDto.criteria),
        }),
        ...(updateFilterDto.isDefault !== undefined && {
          isDefault: updateFilterDto.isDefault,
        }),
      },
    });

    // Parse JSON criteria string back to object
    return {
      id: updatedFilter.id,
      userId: updatedFilter.userId,
      name: updatedFilter.name,
      description: updatedFilter.description,
      criteria: JSON.parse(updatedFilter.criteria) as FilterCriteria,
      isDefault: updatedFilter.isDefault,
      createdAt: updatedFilter.createdAt,
      updatedAt: updatedFilter.updatedAt,
    };
  }

  async delete(id: string, userId: string) {
    // Check if filter exists and user owns it
    const filter = await this.prisma.savedFilter.findUnique({
      where: { id },
    });

    if (!filter) {
      throw new NotFoundException(`Filter with ID ${id} not found`);
    }

    if (filter.userId !== userId) {
      throw new ForbiddenException('You do not have access to this filter');
    }

    // Delete filter
    await this.prisma.savedFilter.delete({ where: { id } });

    return { message: `Filter with ID ${id} deleted successfully` };
  }

  async setDefault(id: string, userId: string) {
    // Check if filter exists and user owns it
    const filter = await this.prisma.savedFilter.findUnique({
      where: { id },
    });

    if (!filter) {
      throw new NotFoundException(`Filter with ID ${id} not found`);
    }

    if (filter.userId !== userId) {
      throw new ForbiddenException('You do not have access to this filter');
    }

    // Unset other defaults for this user
    await this.prisma.savedFilter.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Set this filter as default
    const updatedFilter = await this.prisma.savedFilter.update({
      where: { id },
      data: { isDefault: true },
    });

    // Parse JSON criteria string back to object
    return {
      id: updatedFilter.id,
      userId: updatedFilter.userId,
      name: updatedFilter.name,
      description: updatedFilter.description,
      criteria: JSON.parse(updatedFilter.criteria) as FilterCriteria,
      isDefault: updatedFilter.isDefault,
      createdAt: updatedFilter.createdAt,
      updatedAt: updatedFilter.updatedAt,
    };
  }
}
