import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Medicine {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @Column({ nullable: false })
    name: string;

    @Column()
    description: string;

    @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP'})
    createdAt: Date;
}