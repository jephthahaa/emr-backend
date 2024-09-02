import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity()
export class GlobalInfo {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column("double", { default: 0.05 })
  appointmentRate: number;

  @Column("double", { default: 0.05 })
  cancellationRate: number;

  @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP'})
  createdAt: Date;

  @Column('timestamp', {default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP'})
  updatedAt: Date;
}