import { BaseClass } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity()
export class Laboratory extends BaseClass {
  @Column({
    type: 'uuid',
    unique: true,
    nullable: false,
  })
  user_id: string;

  @Column({
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  name: string;

  @Column({
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  registrationNumber: string;

  @Column({
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  address: string;
}
