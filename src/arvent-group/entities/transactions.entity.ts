import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({name: "transactions", database: "arvent_group"})
export class Transactions {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  idTransaction: string;

  @Column({ type: 'text' })
  response: string;

  @Column()
  status: string;
}
