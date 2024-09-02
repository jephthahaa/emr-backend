import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Record } from "./record";

@Entity()
export class Lab {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    lab: string;

    @Column({ nullable: true })
    fileUrl: string;

    @Column("text")
    notes: string

    @Column("enum", { enum: ["pending", "completed"], default: "pending" })
    status: "pending" | "completed";

    @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date; 

    @ManyToOne(() => Record, record => record.labs)
    consultation: Record;
}