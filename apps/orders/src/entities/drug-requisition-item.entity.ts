import { BaseClass } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('drug_requisition_items')
export class DrugRequisitionItem extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  requisition_id!: string;

  @Column({ type: 'uuid', nullable: false })
  pharmacy_drug_id!: string;

  @Column({ type: 'varchar', nullable: false })
  medication_name!: string;

  @Column({ type: 'int', nullable: false })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  unit_price!: number;
}