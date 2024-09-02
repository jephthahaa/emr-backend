import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Patient } from "./patient";
import { Doctor } from "./doctor";

@Entity()
export class Appointment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "date" })
  appointmentDate: Date;

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  notes: string;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column("timestamp", {
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt: Date;

  @Column("enum", {
    enum: ["pending", "completed", "cancelled", "accepted", "declined"],
    default: "pending",
  })
  status: AppointmentStatus;

  @Column("enum", { enum: ["virtual", "visit"], default: "virtual" })
  type: string;

  @Column({ nullable: true})
  meetingLink: string;

  @ManyToOne(() => Patient, (patient) => patient.appointments)
  patient: Patient;

  @ManyToOne(() => Doctor, (doctor) => doctor.appointments)
  doctor: Doctor;
}

export type AppointmentStatus = "pending" | "completed" | "cancelled" | "accepted" | "declined";