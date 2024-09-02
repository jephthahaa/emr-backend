import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Doctor } from "./doctor";
import { Patient } from "./patient";

@Entity()
export class Transactions {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("enum", { enum: ["payment", "withdrawal"] })
  type: string;

  @Column()
  amount: number;

  @Column({ default: "GHS" })
  currency: string;

  @Column({ unique: true })
  reference: string;

  @Column('enum', { enum: ["mobile_money", "bank"], default: "mobile_money" })
  channel: string;

  @Column("enum", {
    enum: ["success", "failed", "pending"],
    default: "pending",
  })
  status: string;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column("timestamp", {
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt: Date;

  @ManyToOne(() => Doctor, (doctor) => doctor.transactions)
  doctor?: Doctor;

  @ManyToOne(() => Patient, (patient) => patient.transactions)
  patient?: Patient;
}
