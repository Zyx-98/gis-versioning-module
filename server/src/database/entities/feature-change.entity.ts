import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MergeRequest } from './merge-request.entity';
import { ChangeType } from '../enums';

@Entity('feature_changes')
export class FeatureChange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MergeRequest, (mr) => mr.changes)
  @JoinColumn({ name: 'merge_request_id' })
  mergeRequest: MergeRequest;

  @Column({ name: 'merge_request_id' })
  mergeRequestId: string;

  @Column({ name: 'feature_id', type: 'uuid' })
  featureId: string;

  @Column({ name: 'change_type', type: 'enum', enum: ChangeType })
  changeType: ChangeType;

  @Column({ name: 'before_data', type: 'jsonb', nullable: true })
  beforeData: any;

  @Column({ name: 'after_data', type: 'jsonb', nullable: true })
  afterData: any;

  @Column({ name: 'has_conflict', type: 'boolean', default: false })
  hasConflict: boolean;

  @Column({ name: 'conflict_data', type: 'jsonb', nullable: true })
  conflictData: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
