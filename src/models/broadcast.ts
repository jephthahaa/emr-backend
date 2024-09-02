import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Admin } from "./admin";

@Entity()
export class Broadcast {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text")
  message: string;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column("enum", { enum: ["PATIENT", "DOCTOR", "ALL"], default: "ALL" })
  scope: "PATIENT" | "DOCTOR" | "ALL";

  @ManyToOne(() => Admin, (admin) => admin.broadcasts)
  admin: Admin;
}