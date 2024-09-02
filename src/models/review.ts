import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Doctor } from "./doctor";
import { Record } from "./record";
import { Patient } from "./patient";

@Entity()
export class Review {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("enum", { enum: ["pending", "skipped", "completed"], default: "pending" })
  status: string;

  @Column({ default: 0 })
  rating: number;

  @Column("text", { nullable: true })
  comment: string;

  @Column('json', { nullable: true })
  communicationSkill: {
    isProfessional: string;
    isClear: number;
    isAttentive: string;
    isComfortable: string;
  }

  @Column('json', { nullable: true })
  expertise: {
    knowledge: number;
    thorough: string;
    confidence: number;
    helpful: string;
  }

  @ManyToOne(() => Patient, patient => patient.reviews)
  patient: Patient;

  @ManyToOne(() => Doctor, doctor => doctor.reviews)
  doctor: Doctor;

  @OneToOne(() => Record, (record) => record.review)
  @JoinColumn()
  consultation: Record;
}