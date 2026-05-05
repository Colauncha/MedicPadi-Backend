import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityGroup } from '../../entities/community-group.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [TypeOrmModule.forFeature([CommunityGroup])],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}