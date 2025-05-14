import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user_companies')
export class UserCompany {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  business_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  postal_code: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  country: string;

  @Column({ type: 'timestamp', nullable: true })
  registration_date: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  main_activity: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  headquarters_phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 10, nullable: true, default: 'false' })
  subject_to_article_20: string;

  @Column({ type: 'varchar', length: 10, nullable: true, default: 'false' })
  politic_person: string;

  @Column({ type: 'varchar', length: 10, nullable: true, default: 'false' })
  regulated_entity_20: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  participation_percentage: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  last_name: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  cuit_cdi_cie: string;

  @Column({ type: 'text', nullable: true })
  uuid: string;
}
