import { BaseClass } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('lab_tests')
export class LabTest extends BaseClass {
  @Column({
    type: 'varchar',
    nullable: false,
  })
  user_id!: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  name!: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  shortName!: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'float',
    nullable: false,
  })
  price!: number;

  @Column({
    type: 'boolean',
    nullable: true,
    default: false,
  })
  available!: boolean;

  @Column({
    type: 'float',
    nullable: false,
  })
  TAT!: number;

  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
  })
  hasImage!: boolean;

  @Column({
    type: 'string',
    nullable: false,
  })
  department!: string;
}
