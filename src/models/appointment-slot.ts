import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AppointmentRequest } from './appointment-request';
import { Doctor } from './doctor';

@Entity()
export class AppointmentSlot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('date')
    date: Date;

    @Column('time')
    startTime: string;

    @Column('time')
    endTime: string;

    @Column('enum', { enum: ['visit', 'virtual'] })
    type: AppointmentSlotType;

    @Column('enum', { enum: ['available', 'unavailable'], default: 'available' })
    status: AppointmentSlotStatus;

    @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @OneToMany(() => AppointmentRequest, (request) => request.appointmentSlot)
    appointmentRequests: AppointmentRequest[];

    @ManyToOne(() => Doctor, doctor => doctor.appointmentSlots)
    doctor: Doctor;
};

export type AppointmentSlotStatus = 'available' | 'unavailable';
export type AppointmentSlotType = 'visit' | 'virtual';