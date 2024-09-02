import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Record } from './record';

@Entity()
export class Prescription {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @Column()
    medicine: string;

    @Column('enum', {enum: ['prescribe', 'dispense']})
    option: string;

    @Column()
    dosage: string;

    @Column()
    duration: string;

    @Column()
    instructions: string;

    @Column()
    repeat: string;

    @Column()
    additionalInstructions: string;
    
    @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP'})
    createdAt: Date;

    @ManyToOne(() => Record, record => record.prescriptions)
    consultation: Record;
}