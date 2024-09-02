import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Record } from './record';

@Entity()
export class Diagnosis {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @Column()
    name: string;

    @Column()
    code: string;

    @Column()
    consultationNotes: string;
    
    @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP'})
    createdAt: Date;

    @ManyToOne(() => Record, record => record.diagnoses)
    consultation: Record;
}