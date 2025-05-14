
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  idtransaction: string;

  @Column({ name: 'dateTransaction', type: 'timestamp', nullable: true })
  datetransaction: Date;

  @Column({ type: 'text', nullable: true })
  response: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;
}