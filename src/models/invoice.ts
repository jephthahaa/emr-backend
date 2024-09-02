import { Entity, Column, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn } from "typeorm";
import { Record } from "./record";
''
@Entity()
export class Invoice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    notes: string;

    @Column()
    amount: number;

    @Column()
    referenceID: string;

    @Column()
    transactionID: string;

    @Column()
    consultationID: string;

    @Column('enum', {'enum': ['paid', 'unpaid', 'pending']})
    status: string;

    @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP'})
    createdAt: Date;

    @OneToOne(() => Record, record => record.invoice)
    @JoinColumn()
    record: Record;
}