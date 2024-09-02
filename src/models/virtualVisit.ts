import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class VirtualVisit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @Column()
  providerId: string;

  @Column({ type: 'date' })
  visitDate: string;

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column({ nullable: true })
  platform: string;

  @Column({ nullable: true })
  meetingLink: string;
}