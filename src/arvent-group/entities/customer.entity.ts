import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('customers')
export class CustomerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: false })
  lastName: string;

  @Column({ type: 'text', nullable: false })
  email: string;

  @Column({ type: 'int', nullable: false })
  accountId: number;

  @Column({ type: 'text', nullable: true })
  cvu: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'text', nullable: true })
  customerId: string;
}