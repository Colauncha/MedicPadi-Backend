import { BaseClass } from '@medicpadi-backend/contracts';
import { Column, Entity, OneToMany } from 'typeorm';
import { LabTest } from './lab-test.entity';

@Entity('departments')
export class Department extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  user_id!: string;

  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @OneToMany(() => LabTest, (labTest) => labTest.department)
  labTests!: LabTest[];
}
