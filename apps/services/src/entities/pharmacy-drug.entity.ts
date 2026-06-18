import { BaseClass } from '@medicpadi-backend/contracts';
import { Column, Entity, JoinColumn } from 'typeorm';
import { DrugCategory } from './drug_category.entity';

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
    type: 'int',
    nullable: true,
  })
  stock!: number;

  @Column({
    type: 'boolean',
    nullable: true,
    default: false,
  })
  available!: boolean;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  category_id!: string;

  @JoinColumn({ name: 'category_id' })
  category!: DrugCategory;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  drugImage: { public_id: string; url: string } = {
    public_id: '',
    url: '',
  };

  @Column({
    type: 'boolean',
    nullable: true,
    default: false,
  })
  requiresPrescription!: boolean;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  dosage?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  composition?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  sideEffect?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  linkToMedWebsite?: string;
}
