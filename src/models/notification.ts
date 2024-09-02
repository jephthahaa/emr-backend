import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";



@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: string;

  @Column("simple-json")
  payload!: NotificationPayload;

  @Column("uuid")
  receiverId!: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  //   @Column( { nullable: true })
  //   fileUrl: string;
}

export type NotificationPayload = {
  topic?: string;
  message: string;
  from?: string;
}

export type Notify = Pick<Notification, "payload" | "receiverId">;