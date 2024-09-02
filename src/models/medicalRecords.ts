import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Patient } from './patient';

@Entity()
export class MedicalRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @Column('simple-array', { nullable: true })
  diagnoses: string[];

  @Column('simple-array', { nullable: true })
  medications: string[];

  @Column('simple-array', { nullable: true })
  allergies: string[];

  @Column('simple-array', { nullable: true })
  procedures: string[];

  @Column('json', { nullable: true })
  labResults: { parameter: string; result: string }[];

  @Column('json', { nullable: true })
  imagingReports: { type: string; url: string }[];

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @ManyToOne(() => Patient, patient => patient.medicalRecords)
  patient: Patient;
}
