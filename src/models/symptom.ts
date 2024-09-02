import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne } from 'typeorm';
import { Record } from './record';

@Entity()
export class Symptom {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('json')
    symptoms: {
        [key: string]: {
            symptoms: string[];
            notes: string;
        };
    };

    @Column('json')
    duration: {
        from: Date | string,
        to: Date | string
    };

    @Column('json')
    medicinesTaken: {
        medicine: string[];
        notes: string
    }
    
    @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP'})
    createdAt: Date;

    @ManyToOne(() => Record, record => record.symptoms)
    consultation: Record;
}