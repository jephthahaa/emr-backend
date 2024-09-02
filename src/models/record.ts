import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  OneToOne,
  ManyToOne,
} from "typeorm";
import { Diagnosis } from "./diagnosis";
import { Examination } from "./examination";
import { Prescription } from "./prescription";
import { Symptom } from "./symptom";
import { Doctor } from "./doctor";
import { Patient } from "./patient";
import { Invoice } from "./invoice";
import { Lab } from "./lab";
import { FutureVisits } from "./future-visits";
import { Review } from "./review";

@Entity()
export class Record {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column('simple-array')
  complaints: string[];

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @Column("enum", { enum: ["active", "ended", "completed"], default: "active" })
  status: RecordStatus;

  @Column("int", { default: 0 })
  currentStep: number;

  @Column("text", { nullable: true })
  notes: string;

  @Column({ nullable: true })
  reasonEnded: string;

  @OneToMany(() => Diagnosis, (diagnosis) => diagnosis.consultation)
  diagnoses: Diagnosis[];

  @OneToMany(() => Examination, (examination) => examination.consultation)
  examinations: Examination[];

  @OneToMany(() => Prescription, (prescription) => prescription.consultation)
  prescriptions: Prescription[];

  @OneToMany(() => Symptom, (symptom) => symptom.consultation)
  symptoms: Symptom[];

  @OneToMany(() => Lab, (lab) => lab.consultation)
  labs: Lab[];

  @OneToMany(() => FutureVisits, (futureVisits) => futureVisits.consultation)
  futureVisits: FutureVisits[];

  @ManyToOne(() => Doctor, (doctor) => doctor.id)
  doctor: Doctor;

  @ManyToOne(() => Patient, (patient) => patient.id)
  patient: Patient;

  @OneToOne(() => Invoice, (invoice) => invoice.record)
  invoice: Invoice;

  @OneToOne(() => Review, (review) => review.consultation)
  review: Review;

  @Column({nullable: true})
  prescriptionUrl?: string;
}

export type RecordStatus = "active" | "ended" | "completed";