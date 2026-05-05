import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityPost } from '../../entities/community-post.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [TypeOrmModule.forFeature([CommunityPost])],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}