import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Doctor } from "./doctor";

@Entity()
export class Rating {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('decimal', { precision: 2, scale: 1 })
    rating: number;

    @Column()
    comment: string;

    @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

}