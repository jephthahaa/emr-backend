import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user";
import { Broadcast } from "./broadcast";

@Entity()
export class Admin extends User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;
  
  @OneToMany(() => Broadcast, (broadcast) => broadcast.admin)
  broadcasts: Broadcast[];
}
