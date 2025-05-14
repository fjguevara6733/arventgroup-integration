
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'idTransaction', type: 'varchar', length: 50, nullable: false })
  idTransaction: string;

  @Column({ name: 'dateTransaction', type: 'timestamp', nullable: true })
  datetransaction: Date;

  @Column({ type: 'text', nullable: true })
  response: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  type: string;
}