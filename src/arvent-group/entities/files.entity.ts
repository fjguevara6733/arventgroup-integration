
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  typefile: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  filename: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  mimetype: string;

  @Column({ type: 'text', nullable: false })
  data: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  cuit: string;
}