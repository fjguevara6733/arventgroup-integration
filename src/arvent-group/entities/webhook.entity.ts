import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('webhook')
export class Webhook {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: false })
  response: string;

  @Column({ type: 'timestamp', nullable: true })
  date: Date;

  @Column({ type: 'varchar', length: 20, nullable: false })
  status: string;
}