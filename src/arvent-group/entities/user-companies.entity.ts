// company.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'user_companies', database: 'arvent_group' })
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  businessName: string;

  @Column()
  taxId: string;

  @Column()
  address: string;

  @Column()
  postalCode: string;

  @Column()
  city: string;

  @Column()
  country: string;

  @Column({ type: 'date' })
  registrationDate: Date;

  @Column()
  mainActivity: string;

  @Column()
  headquartersPhone: string;

  @Column()
  email: string;

  @Column()
  contractStatuteAttachment: string;

  @Column()
  lastBalanceAttachment: string;

  @Column()
  AFIPRegistrationCertificateAttachment: string;

  @Column()
  IBBRegistrationCertificateAttachment: string;

  @Column()
  notaryActAttachment: string;

  @Column()
  subjectToArticle20: string;

  @Column()
  politicPerson: string;

  @Column()
  regulatedEntity20: string;

  @Column({ type: 'float' })
  participationPercentage: number;

  // Resto de los campos de la tabla Company
}
