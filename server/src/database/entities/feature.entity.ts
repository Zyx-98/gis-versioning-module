import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Dataset } from './dataset.entity';
import { Branch } from './branch.entity';
import { Geometry } from 'geojson';
import { FeatureStatus } from '../enums';
import { User } from './user.entity';

@Entity('features')
export class Feature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Dataset, (dataset) => dataset.features)
  @JoinColumn({ name: 'dataset_id' })
  dataset: Dataset;

  @Column({ name: 'dataset_id' })
  datasetId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'branch_id' })
  branchId: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Geometry', srid: 4326 })
  geometry: Geometry;

  @Column({ type: 'jsonb', nullable: true })
  properties: Record<string, any>;

  @Column({ type: 'enum', enum: FeatureStatus, default: FeatureStatus.ACTIVE })
  status: FeatureStatus;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'uuid', nullable: true, name: 'parent_feature_id' })
  parentFeatureId: string | null; // Track original feature from main branch

  @Column({ type: 'int', nullable: true, name: 'parent_version' })
  parentVersion: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User;

  @Column({ name: 'updated_by', nullable: true })
  updatedById: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
