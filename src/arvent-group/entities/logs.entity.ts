import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('logs')
export class LogsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  method: string;

  @Column()
  url: string;

  @Column()
  type: string;

  @Column({ type: 'text' })
  error: string;

  @Column({ type: 'text' })
  request: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
