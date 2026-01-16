import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to include permission details
    return roles.map((role: any) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
      })),
    }));
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Transform to include permission details
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
      })),
    };
  }

  async create(createRoleDto: CreateRoleDto) {
    // Check if role name already exists
    const existingRole = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException(
        `Role with name ${createRoleDto.name} already exists`,
      );
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: createRoleDto.permissionIds } },
    });

    if (permissions.length !== createRoleDto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // Create role with permissions
    const role = await this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        description: createRoleDto.description,
        rolePermissions: {
          create: createRoleDto.permissionIds.map((permissionId: string) => ({
            permissionId,
          })),
        },
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    // Transform response
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
      })),
    };
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    // Check if role exists
    const existingRole = await this.prisma.role.findUnique({ where: { id } });
    if (!existingRole) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Check for name conflicts if name is being updated
    if (updateRoleDto.name && updateRoleDto.name !== existingRole.name) {
      const nameConflict = await this.prisma.role.findUnique({
        where: { name: updateRoleDto.name },
      });
      if (nameConflict) {
        throw new ConflictException(
          `Role with name ${updateRoleDto.name} already exists`,
        );
      }
    }

    // Verify all permissions exist if permissionIds provided
    if (updateRoleDto.permissionIds) {
      const permissions = await this.prisma.permission.findMany({
        where: { id: { in: updateRoleDto.permissionIds } },
      });

      if (permissions.length !== updateRoleDto.permissionIds.length) {
        throw new BadRequestException('One or more permission IDs are invalid');
      }
    }

    // Update role
    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: {
        name: updateRoleDto.name,
        description: updateRoleDto.description,
        ...(updateRoleDto.permissionIds && {
          rolePermissions: {
            deleteMany: {},
            create: updateRoleDto.permissionIds.map((permissionId: string) => ({
              permissionId,
            })),
          },
        }),
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    // Transform response
    return {
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description,
      createdAt: updatedRole.createdAt,
      updatedAt: updatedRole.updatedAt,
      permissions: updatedRole.rolePermissions.map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
      })),
    };
  }

  async delete(id: string) {
    // Check if role exists
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Check if role is assigned to any users
    const usersWithRole = await this.prisma.userRole.count({
      where: { roleId: id },
    });

    if (usersWithRole > 0) {
      throw new BadRequestException(
        `Cannot delete role: ${usersWithRole} user(s) are assigned to this role`,
      );
    }

    // Delete role (cascade will handle RolePermission deletions)
    await this.prisma.role.delete({ where: { id } });

    return { message: `Role with ID ${id} deleted successfully` };
  }

  async getPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
    });

    return permissions;
  }
}
