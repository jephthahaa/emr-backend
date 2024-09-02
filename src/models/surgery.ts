import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { Patient } from './patient';

@Entity()
export class Surgery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  additionalNotes: string;

  @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP'})
  createdAt: Date;

  @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP'})
    updatedAt: Date;
    
    @ManyToOne(() => Patient, patient => patient.id)
    patient: Patient;
}
