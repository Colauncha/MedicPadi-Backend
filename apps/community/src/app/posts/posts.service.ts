import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  CreateCommunityPostDto,
  PaginationDto,
  PaginationResponseDto,
  ServiceError,
  UpdateCommunityPostDto,
} from '@medicpadi-backend/contracts';
import { buildPaginationResponse } from '@medicpadi-backend/utils';
import { CommunityPost } from '../../entities/community-post.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(CommunityPost)
    private readonly postRepo: Repository<CommunityPost>,
  ) {}

  async create(dto: CreateCommunityPostDto) {
    try {
      const post = this.postRepo.create(dto);
      await this.postRepo.save(post);
      return post;
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to create community post',
      } as ServiceError);
    }
  }

  async findAll(query: PaginationDto): Promise<PaginationResponseDto<CommunityPost>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    try {
      const [data, total] = await this.postRepo.findAndCount({
        where: query.id ? { group_id: query.id } : {},
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' },
      });
      return buildPaginationResponse(data, total, page, limit);
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get community posts',
      } as ServiceError);
    }
  }

  async findOne(id: string) {
    try {
      return await this.postRepo.findOne({ where: { id } });
    } catch (error) {
      throw new RpcException({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Unable to get community post',
      } as ServiceError);
    }
  }

  async update(id: string | undefined, dto: UpdateCommunityPostDto) {
    try {
      const existing = await this.postRepo.findOne({ where: { id } });
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Community post not found',
        } as ServiceError);
      }
      const result = await this.postRepo.update({ id }, dto);
      return result.raw;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to update community post',
          } as ServiceError);
    }
  }

  async remove(id: string) {
    try {
      const existing = await this.findOne(id);
      if (!existing) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Community post not found',
        } as ServiceError);
      }
      await this.postRepo.remove(existing);
      return { message: 'Community post removed successfully' };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: HttpStatus.REQUEST_TIMEOUT,
            message: 'Unable to remove community post',
          } as ServiceError);
    }
  }
}