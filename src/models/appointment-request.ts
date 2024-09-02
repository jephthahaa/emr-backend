import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AppointmentSlot } from './appointment-slot';
import { Patient } from './patient';

@Entity()
export class AppointmentRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  reason: string;

  @Column('text')
  notes: string;

  @Column('enum', { enum: ['virtual', 'visit'], default: 'virtual' })
  type: string;

  @Column('enum', { enum: ['pending', 'accepted', 'declined', 'cancelled'], default: 'pending' })
  status: AppointmentRequestStatus

  @ManyToOne(() => Patient, (patient) => patient.id)
  patient: Patient;

  @ManyToOne(() => AppointmentSlot, (slot) => slot.appointmentRequests)
  appointmentSlot: AppointmentSlot;
}

export type AppointmentRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';