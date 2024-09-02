import { Entity, PrimaryGeneratedColumn, Column, OneToMany, JoinTable, ManyToMany, OneToOne } from 'typeorm';
import { Appointment } from './appointment';
import { MedicalRecord } from './medicalRecords';
import { User } from './user';
import { AppointmentRequest } from './appointment-request';
import { Doctor } from './doctor';
import { Record } from './record';
import { Allergy } from './allergy';
import { Surgery } from './surgery';
import { FamilyMember } from './family-members';
import { Gynae } from './gynae';
import { Favourite } from './favourites';
import { Transactions } from './transaction';
import { Review } from './review';
import { Feedbacks } from "./feedbacks";
import { Issues } from "./issues";
import { Referral } from './referral';

@Entity()
export class Patient extends User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'date' })
  dob: string;

  @Column('enum', { enum: ['male', 'female'] })
  gender: string;

  @Column()
  contact: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column('json', { nullable: true })
  insuranceInfo: {
    provider: string;
  }

  @Column({ nullable: true })
  maritalStatus: string;

  @Column({ nullable: true })
  denomination: string;

  @Column({ nullable: true })
  bloodGroup: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  height: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  weight: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  temperature: number;

  @Column('json', { nullable: true })
  bloodPressure: {
    systolic: number;
    diastolic: number
  }

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  heartRate: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  bloodSugarLevel: number;

  @Column('json', { nullable: true })
  lifestyle: {
    occupation: string;
    parents: {
      maritalStatus: string;
      livingStatus: string;
      married: boolean;
    }
    stress: number;
    additionalNotes: string;
    socialHistory: string;
    alcohol: {
      status: string;
      yearsOfDrinking: number;
    }
    smoking: {
      status: string;
      yearsOfSmoking: number;
    }
    familyHistory: string;
  }

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => Appointment, appointment => appointment.patient)
  appointments: Appointment[];

  @OneToMany(() => AppointmentRequest, (request) => request.patient)
  appointmentRequests: AppointmentRequest[];

  @OneToMany(() => MedicalRecord, medicalRecord => medicalRecord.patient)
  medicalRecords: MedicalRecord[];

  @ManyToMany(() => Doctor, doctor => doctor.patients)
  @JoinTable()
  doctors: Doctor[];

  @OneToMany(() => Record, record => record.patient)
  records: Record[];

  @OneToMany(() => Allergy, allergy => allergy.patient)
  allergies: Allergy[];

  @OneToMany(() => Surgery, surgery => surgery.patient)
  surgeries: Surgery[];

  @OneToMany(() => FamilyMember, familyMember => familyMember.patient)
  familyMembers: FamilyMember[];

  @OneToOne(() => Gynae, gynae => gynae.patient)
  gynae: Gynae;

  @ManyToMany(() => Favourite, favourite => favourite.patient)
  favourites: Favourite[];

  @OneToMany(() => Review, (review) => review.patient)
  reviews: Review[];

  @OneToMany(() => Transactions, transaction => transaction.patient)
  transactions: Transactions[];

  @OneToMany(() => Referral, ref => ref.patient, { nullable: true })
  referrals?: Referral[];
  
  @OneToMany(() => Feedbacks, (feedback) => feedback.patient)
  feedbacks: Feedbacks[];

  @OneToMany(() => Issues, (issues) => issues.patient)
  issues: Issues[];
}