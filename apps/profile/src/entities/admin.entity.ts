import { Column, Entity } from 'typeorm';
import { BaseClass } from '@medicpadi-backend/contracts';

@Entity()
export class Admin extends BaseClass {
  @Column({
    type: 'uuid',
    unique: true,
    nullable: false,
  })
  user_id!: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  firstName?: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  lastName?: string | null;

  @Column({
    type: 'text',
    array: true,
    nullable: false,
  })
  permissions?: string[];
}
