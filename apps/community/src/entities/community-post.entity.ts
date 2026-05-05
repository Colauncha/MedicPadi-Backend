import { BaseClass } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('community_posts')
export class CommunityPost extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  group_id!: string;

  @Column({ type: 'uuid', nullable: false })
  author_id!: string;

  @Column({ type: 'text', nullable: false })
  content!: string;

  @Column({ type: 'boolean', default: false })
  is_anonymous!: boolean;
}