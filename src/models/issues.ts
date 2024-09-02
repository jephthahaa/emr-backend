import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Doctor } from "./doctor";
import { Patient } from "./patient";

@Entity()
export class Issues {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  description: string;

  @Column('enum', { enum: ['patient', 'doctor'], default: 'patient' })
  userType: "patient" | "doctor"

  @Column('enum', { enum: ['open', 'fixed'], default: 'open' })
  status: "open" | "fixed"

  @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP'})
  createdAt: Date;

  @ManyToOne(() => Doctor, doctor => doctor.issues, { nullable: true })
  doctor: Doctor;

  @ManyToOne(() => Patient, patient => patient.issues, { nullable: true })
  patient: Patient
}