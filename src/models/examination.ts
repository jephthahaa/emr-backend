import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Record } from './record';

@Entity()
export class Examination {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @Column()
    notesFromPatient: string;

    @Column()
    notesFromDoctor: string;

    @Column('simple-array')
    reports: string[];
    
    @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP'})
    createdAt: Date;

    @ManyToOne(() => Record, record => record.examinations)
    consultation: Record;
}