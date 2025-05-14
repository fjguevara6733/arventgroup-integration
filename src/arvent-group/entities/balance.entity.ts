
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('balance')
export class Balance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 22, nullable: true })
  cvu: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: false })
  amount: number;

  @Column({ type: 'int', nullable: true })
  accountId: number;
}