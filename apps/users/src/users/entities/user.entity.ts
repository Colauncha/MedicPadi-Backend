import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { UserRole } from '@app/contracts/users/enums/roles';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 50,
    unique: true,
  })
  email: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 50,
  })
  firstName: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 50,
  })
  lastName: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 255,
  })
  passwordhash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PATIENT,
  })
  role: UserRole;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 14,
  })
  phoneNumber: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 14,
  })
  emergencyContact: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  isVerified: boolean;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
