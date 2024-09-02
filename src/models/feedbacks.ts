import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Doctor } from "./doctor";
import { Patient } from "./patient";

@Entity()
export class Feedbacks {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  type: string;

  @Column({ nullable: false })
  comment: string;

  @Column('enum', { enum: ['patient', 'doctor'], default: 'patient' })
  userType: "patient" | "doctor"

  @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP'})
  createdAt: Date;

  @ManyToOne(() => Doctor, doctor => doctor.feedbacks, { nullable: true })
  doctor: Doctor;

  @ManyToOne(() => Patient, patient => patient.feedbacks, { nullable: true })
  patient: Patient
}