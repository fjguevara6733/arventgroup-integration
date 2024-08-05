// person.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'user', database: 'arvent_group' })
export class PersonEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  regulatedEntity20: string;

  @Column()
  politicPerson: string;

  @Column()
  phone: string;

  @Column()
  occupation: string;

  @Column()
  name: string;

  @Column()
  locality: string;

  @Column()
  lastName: string;

  @Column()
  fiscalSituation: string;

  @Column()
  fileCuitFront: string;

  @Column()
  fileCuitBack: string;

  @Column()
  cuitCuil: string;

  @Column({ type: 'int' })
  cp: number;

  @Column()
  country: string;

  @Column()
  address: string;
}
