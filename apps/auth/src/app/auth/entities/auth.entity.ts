import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuthRole } from '@medicpadi-backend/contracts';

@Entity()
export class Auth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 50,
    unique: true,
  })
  email: string;

  // @Column({
  //   type: 'varchar',
  //   nullable: false,
  //   length: 50,
  // })
  // firstName: string;

  // @Column({
  //   type: 'varchar',
  //   nullable: false,
  //   length: 50,
  // })
  // lastName: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 255,
  })
  passwordhash: string;

  @Column({
    type: 'enum',
    enum: AuthRole,
    default: AuthRole.PATIENT,
  })
  role: AuthRole;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 14,
  })
  phoneNumber: string;

  // @Column({
  //   type: 'varchar',
  //   nullable: false,
  //   length: 14,
  // })
  // emergencyContact: string;

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
