import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";

@Entity()
export class Complaint {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    complaint: string;

    @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @Column('boolean', { default: true })
    status: boolean;
}