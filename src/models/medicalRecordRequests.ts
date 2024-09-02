import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from "typeorm";
import { Doctor } from "./doctor";
import { Patient } from "./patient";

@Entity()
export class RecordRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Doctor, doctor => doctor.id)
  doctor: Doctor;

  @ManyToOne(() => Patient, patient => patient.id)
  patient: Patient;

  @Column({ default: false })
  approved: boolean;

  @Column('timestamp', { default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}
