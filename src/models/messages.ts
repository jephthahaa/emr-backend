import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Messeges {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  consultationId: string;

  @Column("text")
  message: string;

  @Column("uuid")
  senderId: string;

  @Column("uuid")
  receiverId: string;

  @Column("boolean", { default: false })
  read: boolean;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column("text", { nullable: true })
  fileUrl: string;
}