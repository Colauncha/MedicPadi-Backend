import { BaseClass } from '@medicpadi-backend/contracts';
import { Column, Entity, OneToMany } from 'typeorm';
import { LabTest } from './lab-test.entity';
import { PharmacyDrug } from './pharmacy-drug.entity';

@Entity('drug_categories')
export class DrugCategory extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  user_id!: string;

  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @OneToMany(() => PharmacyDrug, (pharmacyDrug) => pharmacyDrug.category)
  pharmacyDrugs!: PharmacyDrug[];
}
