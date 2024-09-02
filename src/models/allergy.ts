import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, ManyToOne } from "typeorm";
import { Patient } from "./patient";

@Entity()
export class Allergy {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  allergy: string;

  @Column('enum', { enum: ['medication', 'non-medication', 'food'], default: 'medication' })
  type: string;

  @Column('enum', { enum: ['mild', 'moderate', 'severe'], default: 'mild' })
  severity: string;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column("timestamp", {
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
    updatedAt: Date;
    
    @ManyToOne(() => Patient, patient => patient.allergies)
    patient: Patient;
}
