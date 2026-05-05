import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CommunityPatterns,
  CreateCommunityPostDto,
  PaginationDto,
  UpdateCommunityPostDto,
} from '@medicpadi-backend/contracts';
import { PostsService } from './posts.service';

@Controller()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @MessagePattern(CommunityPatterns.POSTS.CREATE)
  create(@Payload() dto: CreateCommunityPostDto) {
    return this.postsService.create(dto);
  }

  @MessagePattern(CommunityPatterns.POSTS.FIND_ALL)
  findAll(@Payload() query: PaginationDto) {
    return this.postsService.findAll(query);
  }

  @MessagePattern(CommunityPatterns.POSTS.RETRIEVE)
  findOne(@Payload() id: string) {
    return this.postsService.findOne(id);
  }

  @MessagePattern(CommunityPatterns.POSTS.UPDATE)
  update(@Payload() dto: UpdateCommunityPostDto) {
    return this.postsService.update(dto.id, dto);
  }

  @MessagePattern(CommunityPatterns.POSTS.DELETE)
  remove(@Payload() id: string) {
    return this.postsService.remove(id);
  }
}