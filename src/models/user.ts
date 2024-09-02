import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Rating } from "./rating";
import { PaymentMethod } from "./paymentMethod";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean; 

  @Column("json")
  notifications: {
    status: boolean;
    email: boolean;
    messages: boolean;
    appointments: boolean;
    records: boolean;
  } = {
    status: true,
    email: true,
    messages: true,
    appointments: true,
    records: true,
  };

  @Column({ nullable: true })
  profilePicture: string;

  @OneToMany(() => PaymentMethod, (paymentMethod) => paymentMethod.doctor)
  paymentMethods: PaymentMethod[];
}
