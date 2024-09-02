import { Column, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Doctor } from "./doctor";
import { Patient } from "./patient";
import { z } from "zod";


@Entity()
export class Referral {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => Doctor, doctor => doctor.referrals)
    doctor: Doctor;

    @ManyToOne(() => Doctor, doctor => doctor.referrals)
    referredDoctor: Doctor;

    @ManyToOne(() => Patient, patient => patient.referrals)
    patient: Patient;

    @Column("enum", { enum: ["pending", "accepted", "declined"] })
    status: ReferPatientStatus;
}

export type ReferPatientStatus = "pending" | "accepted" | "declined";

export const referPatientSchema = z.object({
    referredDoctorId: z.string().uuid("referredDoctorId must be a valid UUID"),
    patientId: z.string().uuid("PatientId  must be a valid UUID"),
});