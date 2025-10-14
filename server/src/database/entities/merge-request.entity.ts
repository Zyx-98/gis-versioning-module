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
import { Branch } from './branch.entity';
import { MergeRequestStatus } from '../enums';
import { User } from './user.entity';
import { FeatureChange } from './feature-change.entity';

@Entity('merge_requests')
export class MergeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Branch, (branch) => branch.mergeRequests)
  @JoinColumn({ name: 'source_branch_id' })
  sourceBranch: Branch;

  @Column({ name: 'source_branch_id' })
  sourceBranchId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'target_branch_id' })
  targetBranch: Branch;

  @Column({ name: 'target_branch_id' })
  targetBranchId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: MergeRequestStatus,
    default: MergeRequestStatus.PENDING,
  })
  status: MergeRequestStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: User;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedById: string;

  @Column({ name: 'review_comment', type: 'text', nullable: true })
  reviewComment: string;

  @Column({ type: 'jsonb', nullable: true })
  conflicts: any[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @OneToMany(() => FeatureChange, (change) => change.mergeRequest)
  changes: FeatureChange[];
}
