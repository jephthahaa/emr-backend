import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Doctor } from "./doctor";

@Entity()
export class PaymentMethod {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // @Column({ nullable: true })
  // cardNumber?: string;

  // @Column({ nullable: true })
  // nameOnCard?: string;

  // @Column({ nullable: true })
  // mobileMoneyNumber?: string;

  // @Column({ nullable: true })
  // mobileMoneyProvider?: string;

  // @Column({ nullable: true })
  // mobileMoneyName?: string;

  @Column({ nullable: true })
  accountNumber?: string;

  @Column('enum', { enum: ['mobile_money', 'bank'], default: 'mobile_money' })
  type: string;

  @Column({ nullable: true })
  reference: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @ManyToOne(() => Doctor, (doctor) => doctor.paymentMethods)
  doctor: Doctor;
}
