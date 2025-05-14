import {
  Entity,
  PrimaryGeneratedColumn,
  Column
} from 'typeorm';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ name:'lastName', type: 'varchar', length: 255, nullable: true })
  lastname: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ name: 'postalCode', type: 'int', nullable: true })
  postalCode: number;

  @Column({ name: 'cuitCuil', type: 'varchar', length: 11, nullable: true })
  cuitcuil: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  locality: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  occupation: string;

  @Column({ name:'fiscalSituation', type: 'varchar', length: 50, nullable: true })
  fiscalsituation: string;

  @Column({ name: 'regulatedEntity20',type: 'varchar', length: 10, nullable: true, default: 'false' })
  regulatedEntity20: string;

  @Column({ name: 'politicPerson',type: 'varchar', length: 10, nullable: true, default: 'false' })
  politicPerson: string;

  @Column({ type: 'text', nullable: true })
  uuid: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email: string;

  @Column({ type: 'int', nullable: true })
  accountId: number;
}
