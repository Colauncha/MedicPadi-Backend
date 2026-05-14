import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CommunityPatterns,
  CreateCommunityGroupDto,
  PaginationDto,
  UpdateCommunityGroupDto,
} from '@medicpadi-backend/contracts';
import { GroupsService } from './groups.service';

@Controller()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @MessagePattern(CommunityPatterns.GROUPS.CREATE)
  create(@Payload('data') dto: CreateCommunityGroupDto) {
    return this.groupsService.create(dto);
  }

  @MessagePattern(CommunityPatterns.GROUPS.FIND_ALL)
  findAll(@Payload('data') query: PaginationDto) {
    return this.groupsService.findAll(query);
  }

  @MessagePattern(CommunityPatterns.GROUPS.RETRIEVE)
  findOne(@Payload('data') id: string) {
    return this.groupsService.findOne(id);
  }

  @MessagePattern(CommunityPatterns.GROUPS.UPDATE)
  update(@Payload('data') dto: UpdateCommunityGroupDto) {
    return this.groupsService.update(dto.id, dto);
  }

  @MessagePattern(CommunityPatterns.GROUPS.DELETE)
  remove(@Payload('data') id: string) {
    return this.groupsService.remove(id);
  }
}