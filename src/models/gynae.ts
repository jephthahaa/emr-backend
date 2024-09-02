import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Patient } from "./patient";
import path from "path";

@Entity()
export class Gynae {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("simple-array")
  contraception: string[];

  @Column()
  additionalInstructions: string;

  @Column()
  numberOfPregnancies: number;

  @Column()
  numberOfChildren: number;

  @Column("simple-array")
  pregnancyComplications: string[];

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column("timestamp", {
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt: Date;

  @ManyToOne(() => Patient, (patient) => patient.gynae)
  patient: Patient;
}
