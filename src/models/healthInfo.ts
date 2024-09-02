import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class HealthInformation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @Column({ nullable: true })
  bloodPressure: string;

  @Column({ nullable: true })
  heartRate: string;

  @Column({ nullable: true })
  bloodSugar: string;

  @Column({ nullable: true })
  cholesterolLevel: string;

  @Column({ nullable: true })
  bodyTemperature: string;

  @Column({ nullable: true })
  weight: string;

  @Column({ nullable: true })
  height: string;

  @Column({ nullable: true })
  bmi: string;

  @Column({ type: 'date', nullable: true })
  lastCheckupDate: Date;

  @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP'})
  createdAt: Date;

  @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP'})
  updatedAt: Date;
}