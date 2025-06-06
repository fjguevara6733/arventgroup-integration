
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  key: string;

  @Column({ name: 'secretKey', type: 'text', nullable: true })
  secretKey: string;

  @Column({ name: 'need_webhook', nullable: true, default: false })
  needWebhook: boolean;
}