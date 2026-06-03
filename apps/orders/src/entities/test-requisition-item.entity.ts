import { BaseClass, TestItemStatus } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('test_requisition_items')
export class TestRequisitionItem extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  requisition_id!: string;

  @Column({ type: 'uuid', nullable: false })
  lab_test_id!: string;

  @Column({ type: 'varchar', nullable: false })
  test_name!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  unit_price!: number;

  @Column({ type: 'text', nullable: true })
  result?: string;

  @Column({ type: 'varchar', nullable: true })
  result_file_url?: string;

  @Column({
    type: 'enum',
    enum: TestItemStatus,
    default: TestItemStatus.PENDING,
  })
  status!: TestItemStatus;

  @Column({ type: 'timestamp', nullable: true })
  completed_at?: Date;
}
