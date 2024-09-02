import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Icds {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP'})
  createdAt: Date;
}