
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity('clients')
export class ClientEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'client_id', type: 'varchar', length: 50, nullable: true })
  clientId: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  cuit: string;

  @Column({ type: 'timestamp', nullable: true })
  creation_date: Date;

  @Column({ type: 'varchar', length: 30, nullable: true })
  cvu: string;

  @Column({ type: 'int', nullable: true })
  accountId: number;

  @Column({nullable: true})
  alias: string;
}