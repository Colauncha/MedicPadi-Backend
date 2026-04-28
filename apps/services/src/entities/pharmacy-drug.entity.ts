import { BaseClass } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('pharmacy_drugs')
export class PharmacyDrug extends BaseClass {
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
}
