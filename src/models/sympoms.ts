import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Symptoms {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @Column()
    name: string;

    @Column()
    type: string;

    @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP'})
    createdAt: Date;
}