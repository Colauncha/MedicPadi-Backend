import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  CreateCommunityGroupDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateCommunityGroupDto,
} from '@medicpadi-backend/contracts';
import { CommunityGroup } from '../../entities/community-group.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(CommunityGroup)
    private readonly groupRepo: Repository<CommunityGroup>,
  ) {}

  async create(dto: CreateCommunityGroupDto) {
    try {
      const group = this.groupRepo.create(dto);
      await this.groupRepo.save(group);
      return group;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create community group',
      } as ServiceError);
    }
  }

  async findAll(query: PaginationDto): Promise<PaginationResponseDto<CommunityGroup>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const response: PaginationResponseDto<CommunityGroup> = {
      data: [],
      total: 0,
      page,
      limit,
    };
    try {
      const result = await this.groupRepo.findAndCount({
        where: query.search ? { name: ILike(`%${query.search}%`) } : {},
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      response.data = result[0];
      response.total = result[1];
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get community groups',
      } as ServiceError);
    }
    return response;
  }

  async findOne(id: string) {
    try {
      return await this.groupRepo.findOne({ where: { id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get community group',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, dto: UpdateCommunityGroupDto) {
    try {
      const existing = await this.groupRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Community group not found',
        } as ServiceError);
      }
      const result = await this.groupRepo.update({ id }, dto);
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update community group',
          } as ServiceError);
    }
  }

  async remove(id: string) {
    try {
      const existing = await this.findOne(id);
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Community group not found',
        } as ServiceError);
      }
      await this.groupRepo.remove(existing);
      return { message: 'Community group removed successfully' };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove community group',
          } as ServiceError);
    }
  }
}