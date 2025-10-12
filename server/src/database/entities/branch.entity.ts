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
import { Dataset } from './dataset.entity';
import { User } from './user.entity';
import { BranchStatus } from '../enums';
import { MergeRequest } from './merge-request.entity';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'is_main', type: 'boolean', default: false })
  isMain: boolean;

  @ManyToOne(() => Dataset, (dataset) => dataset.branches)
  @JoinColumn({ name: 'dataset_id' })
  dataset: Dataset;

  @Column({ name: 'dataset_id' })
  datasetId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @Column({ type: 'uuid', nullable: true, name: 'branched_from' })
  branchedFrom: string | null; // Main branch ID

  @Column({ type: 'enum', enum: BranchStatus, default: BranchStatus.ACTIVE })
  status: BranchStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => MergeRequest, (mr) => mr.sourceBranch)
  mergeRequests: MergeRequest[];
}
