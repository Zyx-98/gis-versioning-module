import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Department } from './department.entity';
import { User } from './user.entity';
import { Feature } from './feature.entity';
import { Branch } from './branch.entity';

@Entity('datasets')
export class Dataset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'geo_type', type: 'varchar' })
  geoType:
    | 'point'
    | 'line'
    | 'polygon'
    | 'multipoint'
    | 'multiline'
    | 'multipolygon'
    | 'geometry';

  @ManyToOne(() => Department, (department) => department.datasets)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'department_id' })
  departmentId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => Branch, (branch) => branch.dataset)
  branches: Branch[];

  @OneToMany(() => Feature, (feature) => feature.dataset)
  features: Feature[];
}
