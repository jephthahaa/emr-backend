import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class InteroperabilitySettings {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column()
  hl7Enabled: boolean;

  @Column()
  fhirEnabled: boolean;
}