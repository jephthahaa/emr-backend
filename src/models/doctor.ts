import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
} from "typeorm";
import { User } from "./user";
import { Appointment } from "./appointment";
import { AppointmentSlot } from "./appointment-slot";
import { Patient } from "./patient";
import { Record } from "./record";
import { Transactions } from "./transaction";
import { Favourite } from "./favourites";
import { Review } from "./review";
import { PaymentMethod } from "./paymentMethod";
import { Feedbacks } from "./feedbacks";
import { Issues } from "./issues";
import { Referral } from "./referral";

@Entity()
export class Doctor extends User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  MDCRegistration: string;

  @Column({ type: "date" })
  dob: string;

  @Column("enum", { enum: ["male", "female"] })
  gender: string;

  @Column()
  contact: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column("simple-array", { nullable: true })
  qualifications: string[];

  @Column("simple-array", { nullable: true })
  specializations: string[];

  @Column({ nullable: true })
  experience: number;

  @Column("enum", { enum: ["verified", "unverified"], default: "unverified" })
  verification_status: string;

  @Column("json", { nullable: true })
  education: {
    degree: string;
    school: string;
  }[];

  @Column({ type: "text", nullable: true })
  bio: string;

  @Column("simple-array", { nullable: true })
  languages: string[] = ["English Language"];

  @Column("simple-array", { nullable: true })
  awards: string[];

  @Column({ nullable: true})
  profilePicture: string;

  @Column("json", { nullable: true })
  IDs: {
    front: string;
    back: string;
  };

  @Column("json", { nullable: true })
  rate: {
    amount: number;
    lengthOfSession: number;
  };

  @Column("decimal", { precision: 5, scale: 2, nullable: true })
  balance: number;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column("timestamp", {
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt: Date;

  @OneToMany(() => Appointment, (appointment) => appointment.patient)
  appointments: Appointment[];

  @OneToMany(() => AppointmentSlot, (appointmentSlot) => appointmentSlot.doctor)
  appointmentSlots: AppointmentSlot[];

  @ManyToMany(() => Patient, (patient) => patient.doctors, { cascade: true })
  patients: Patient[];

  @ManyToMany(() => Favourite, (favorite) => favorite.doctor)
  patientsFavorited: Patient[];

  @OneToMany(() => Record, (record) => record.doctor)
  records: Record[];

  @OneToMany(() => Review, (review) => review.doctor)
  reviews: Review[];

  @OneToMany(() => Transactions, (transaction) => transaction.doctor)
  transactions: Transactions[];

  @OneToMany(() => PaymentMethod, method => method.doctor)
  paymentMethods: PaymentMethod[];

  @OneToMany(() => Feedbacks, (feedback) => feedback.doctor)
  feedbacks: Feedbacks[];

  @OneToMany(() => Issues, (issues) => issues.doctor)
  issues: Issues[];

  @Column({ nullable: true })
  signaturePath?: string;

  @OneToMany(() => Referral, ref => ref.doctor)
  referrals?: Referral[]
}
