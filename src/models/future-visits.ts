import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Record } from "./record";

@Entity()
export class FutureVisits {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    type: string;

    @Column('enum', {'enum': ['sms', 'email', 'both'], default: "both" })
    messageType: FutureVisitMsgType;

    @Column()
    message: string;

    @Column('datetime')
    sendMessageAt: Date;

    @ManyToOne(() => Record, record => record.futureVisits)
    consultation: Record;
}

export type FutureVisitMsgType = "sms" | "email" | "both";