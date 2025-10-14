import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  CreateDatasetDto,
  CheckoutBranchDto,
  CreateFeatureDto,
  UpdateFeatureDto,
  CreateMergeRequestDto,
  UpdateMergeRequestDto,
} from '../dto';
import { Dataset } from 'src/database/entities/dataset.entity';
import { Branch } from 'src/database/entities/branch.entity';
import { Feature } from 'src/database/entities/feature.entity';
import { MergeRequest } from 'src/database/entities/merge-request.entity';
import { FeatureChange } from 'src/database/entities/feature-change.entity';
import {
  BranchStatus,
  ChangeType,
  FeatureStatus,
  MergeRequestStatus,
  UserRole,
} from 'src/database/enums';
import { User } from 'src/database/entities/user.entity';

@Injectable()
export class GISVersioningService {
  private readonly logger = new Logger(GISVersioningService.name);

  constructor(
    @InjectRepository(Dataset)
    private datasetRepo: Repository<Dataset>,
    @InjectRepository(Branch)
    private branchRepo: Repository<Branch>,
    @InjectRepository(Feature)
    private featureRepo: Repository<Feature>,
    @InjectRepository(MergeRequest)
    private mergeRequestRepo: Repository<MergeRequest>,
    @InjectRepository(FeatureChange)
    private featureChangeRepo: Repository<FeatureChange>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new dataset with main branch
   */
  async createDataset(
    userId: string,
    departmentId: string,
    createDatasetDto: CreateDatasetDto,
  ): Promise<Dataset> {
    this.logger.log(
      `Creating dataset: ${createDatasetDto.name} for department: ${departmentId}`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create dataset
      const dataset = this.datasetRepo.create({
        name: createDatasetDto.name,
        description: createDatasetDto.description,
        geoType: createDatasetDto.geoType,
        departmentId,
        createdById: userId,
      });
      await queryRunner.manager.save(dataset);

      // Create main branch
      const mainBranch = this.branchRepo.create({
        name: 'main',
        isMain: true,
        datasetId: dataset.id,
        createdById: userId,
        status: BranchStatus.ACTIVE,
        branchedFrom: null,
      });
      await queryRunner.manager.save(mainBranch);

      await queryRunner.commitTransaction();

      this.logger.log(`Dataset created successfully: ${dataset.id}`);
      return dataset;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create dataset: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all datasets for a department
   */
  async getDatasetsByDepartment(departmentId: string): Promise<Dataset[]> {
    return await this.datasetRepo.find({
      where: { departmentId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single dataset by ID
   */
  async getDatasetById(datasetId: string): Promise<Dataset> {
    const dataset = await this.datasetRepo.findOne({
      where: { id: datasetId },
      relations: ['createdBy', 'department'],
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    return dataset;
  }

  /**
   * Checkout from main branch (create working branch)
   */
  async checkoutBranch(
    userId: string,
    checkoutBranchDto: CheckoutBranchDto,
  ): Promise<Branch> {
    const { datasetId, branchName } = checkoutBranchDto;

    this.logger.log(
      `User ${userId} checking out branch: ${branchName} from dataset: ${datasetId}`,
    );

    // Get main branch
    const mainBranch = await this.branchRepo.findOne({
      where: { datasetId, isMain: true },
    });

    if (!mainBranch) {
      throw new NotFoundException('Main branch not found');
    }

    // Check if branch name already exists (active branches only)
    const existingBranch = await this.branchRepo.findOne({
      where: {
        datasetId,
        name: branchName,
        status: BranchStatus.ACTIVE,
      },
    });

    if (existingBranch) {
      throw new BadRequestException('Branch name already exists');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create new branch
      const newBranch = this.branchRepo.create({
        name: branchName,
        isMain: false,
        datasetId,
        createdById: userId,
        branchedFrom: mainBranch.id,
        status: BranchStatus.ACTIVE,
      });
      await queryRunner.manager.save(newBranch);

      // Copy all active features from main branch
      const mainFeatures = await this.featureRepo.find({
        where: { branchId: mainBranch.id, status: FeatureStatus.ACTIVE },
      });

      this.logger.log(`Copying ${mainFeatures.length} features to new branch`);

      for (const feature of mainFeatures) {
        const branchFeature = this.featureRepo.create({
          datasetId: feature.datasetId,
          branchId: newBranch.id,
          geometry: feature.geometry,
          properties: feature.properties,
          status: FeatureStatus.ACTIVE,
          version: feature.version,
          parentFeatureId: feature.id,
          parentVersion: feature.version,
          createdById: userId,
        });
        await queryRunner.manager.save(branchFeature);
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Branch ${branchName} created successfully: ${newBranch.id}`,
      );
      return newBranch;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to checkout branch: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all branches for a dataset
   */
  async getBranchesByDataset(datasetId: string): Promise<Branch[]> {
    return await this.branchRepo.find({
      where: { datasetId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single branch by ID
   */
  async getBranchById(branchId: string): Promise<Branch> {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId },
      relations: ['createdBy', 'dataset'],
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  /**
   * Add feature to branch
   */
  async addFeature(
    userId: string,
    branchId: string,
    createFeatureDto: CreateFeatureDto,
  ): Promise<Feature> {
    this.logger.log(`Adding feature to branch: ${branchId}`);

    const branch = await this.branchRepo.findOne({
      where: { id: branchId },
      relations: ['createdBy'],
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (branch.isMain) {
      throw new BadRequestException('Cannot directly modify main branch');
    }

    if (branch.status !== BranchStatus.ACTIVE) {
      throw new BadRequestException('Cannot modify inactive branch');
    }

    // Check if user is the creator of the branch
    if (branch.createdById !== userId) {
      throw new ForbiddenException(
        'You can only edit branches that you created',
      );
    }

    this.validateGeometry(createFeatureDto.geometry);

    const feature = this.featureRepo.create({
      datasetId: branch.datasetId,
      branchId: branch.id,
      geometry: createFeatureDto.geometry,
      properties: createFeatureDto.properties || {},
      status: FeatureStatus.ACTIVE,
      version: 1,
      parentFeatureId: null,
      createdById: userId,
    });

    const savedFeature = await this.featureRepo.save(feature);
    this.logger.log(`Feature created: ${savedFeature.id}`);

    return savedFeature;
  }

  /**
   * Update feature in branch
   */
  async updateFeature(
    userId: string,
    featureId: string,
    updateFeatureDto: UpdateFeatureDto,
  ): Promise<Feature> {
    this.logger.log(`Updating feature: ${featureId}`);

    const feature = await this.featureRepo.findOne({
      where: { id: featureId },
      relations: ['branch', 'branch.createdBy'],
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    if (feature.branch.isMain) {
      throw new BadRequestException('Cannot directly modify main branch');
    }

    if (feature.branch.status !== BranchStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot modify features in inactive branch',
      );
    }

    // Check if user is the creator of the branch
    if (feature.branch.createdById !== userId) {
      throw new ForbiddenException(
        'You can only edit branches that you created',
      );
    }

    // Update geometry if provided
    if (updateFeatureDto.geometry) {
      this.validateGeometry(updateFeatureDto.geometry);
      feature.geometry = updateFeatureDto.geometry;
    }

    // Update properties if provided
    if (updateFeatureDto.properties) {
      feature.properties = updateFeatureDto.properties;
    }

    feature.version += 1;
    feature.updatedById = userId;
    feature.updatedAt = new Date();

    const savedFeature = await this.featureRepo.save(feature);
    this.logger.log(`Feature updated: ${featureId}`);

    return savedFeature;
  }

  /**
   * Delete feature in branch (soft delete)
   */
  async deleteFeature(userId: string, featureId: string): Promise<Feature> {
    this.logger.log(`Deleting feature: ${featureId}`);

    const feature = await this.featureRepo.findOne({
      where: { id: featureId },
      relations: ['branch', 'branch.createdBy'],
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    if (feature.branch.isMain) {
      throw new BadRequestException('Cannot directly modify main branch');
    }

    if (feature.branch.status !== BranchStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot modify features in inactive branch',
      );
    }

    // Check if user is the creator of the branch
    if (feature.branch.createdById !== userId) {
      throw new ForbiddenException(
        'You can only edit branches that you created',
      );
    }

    feature.status = FeatureStatus.DELETED;
    feature.updatedById = userId;
    feature.updatedAt = new Date();

    const savedFeature = await this.featureRepo.save(feature);
    this.logger.log(`Feature deleted: ${featureId}`);

    return savedFeature;
  }

  async canUserEditBranch(
    userId: string,
    branchId: string,
    userRole: UserRole,
  ): Promise<{ canEdit: boolean; reason?: string }> {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId },
      relations: ['createdBy'],
    });

    if (!branch) {
      return { canEdit: false, reason: 'Branch not found' };
    }

    if (branch.isMain) {
      if (userRole === UserRole.ADMIN) {
        return { canEdit: true };
      } else {
        return {
          canEdit: false,
          reason: 'Only admins can edit the main branch',
        };
      }
    }

    if (branch.status !== BranchStatus.ACTIVE) {
      return { canEdit: false, reason: 'Cannot edit inactive branch' };
    }

    if (branch.createdById !== userId) {
      return {
        canEdit: false,
        reason: 'You can only edit branches that you created',
      };
    }

    return { canEdit: true };
  }

  /**
   * Get all features in a branch
   */
  async getBranchFeatures(
    branchId: string,
    includeDeleted: boolean = false,
  ): Promise<Feature[]> {
    const whereClause: any = { branchId };

    if (!includeDeleted) {
      whereClause.status = FeatureStatus.ACTIVE;
    }

    return await this.featureRepo.find({
      where: whereClause,
      relations: ['createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create merge request
   */
  async createMergeRequest(
    userId: string,
    createMergeRequestDto: CreateMergeRequestDto,
  ): Promise<MergeRequest> {
    const { sourceBranchId, description } = createMergeRequestDto;

    this.logger.log(`Creating merge request from branch: ${sourceBranchId}`);

    const sourceBranch = await this.branchRepo.findOne({
      where: { id: sourceBranchId },
      relations: ['dataset'],
    });

    if (!sourceBranch) {
      throw new NotFoundException('Source branch not found');
    }

    if (sourceBranch.isMain) {
      throw new BadRequestException(
        'Cannot create merge request from main branch',
      );
    }

    if (sourceBranch.status !== BranchStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot create merge request from inactive branch',
      );
    }

    if (!sourceBranch.branchedFrom) {
      throw new BadRequestException(
        `Cannot create merge request from unknown branched from`,
      );
    }

    // Check if there's already an active merge request for this branch
    const existingMergeRequest = await this.mergeRequestRepo.findOne({
      where: {
        sourceBranchId,
        status: In([
          MergeRequestStatus.DRAFT,
          MergeRequestStatus.REVIEWING,
          MergeRequestStatus.PENDING,
          MergeRequestStatus.CONFLICT,
        ]),
      },
    });

    if (existingMergeRequest) {
      throw new BadRequestException(
        'This branch already has an active merge request. Please complete or cancel the existing merge request before creating a new one.',
      );
    }

    const targetBranch = await this.branchRepo.findOne({
      where: { id: sourceBranch.branchedFrom, isMain: true },
    });

    if (!targetBranch) {
      throw new NotFoundException('Target main branch not found');
    }

    const mergeRequest = this.mergeRequestRepo.create({
      sourceBranchId: sourceBranch.id,
      targetBranchId: targetBranch.id,
      description,
      status: MergeRequestStatus.DRAFT,
      createdById: userId,
      conflicts: [],
    });

    const savedMR = await this.mergeRequestRepo.save(mergeRequest);

    await this.trackChangesForDraft(
      savedMR.id,
      sourceBranchId,
      targetBranch.id,
    );

    this.logger.log(`Merge request created as draft: ${savedMR.id}`);

    return await this.mergeRequestRepo.findOneOrFail({
      where: { id: savedMR.id },
      relations: ['sourceBranch', 'targetBranch', 'createdBy', 'changes'],
    });
  }

  async hasActiveMergeRequest(branchId: string): Promise<boolean> {
    const count = await this.mergeRequestRepo.count({
      where: {
        sourceBranchId: branchId,
        status: In([
          MergeRequestStatus.DRAFT,
          MergeRequestStatus.REVIEWING,
          MergeRequestStatus.PENDING,
          MergeRequestStatus.CONFLICT,
        ]),
      },
    });

    return count > 0;
  }

  /**
   * Track changes for draft merge request (without conflict detection)
   */
  private async trackChangesForDraft(
    mergeRequestId: string,
    sourceBranchId: string,
    targetBranchId: string,
  ): Promise<void> {
    const sourceFeatures = await this.featureRepo.find({
      where: { branchId: sourceBranchId },
    });

    const targetFeaturesMap = new Map<string, Feature>();
    const targetFeatures = await this.featureRepo.find({
      where: { branchId: targetBranchId },
    });
    targetFeatures.forEach((f) => targetFeaturesMap.set(f.id, f));

    for (const sourceFeature of sourceFeatures) {
      let changeType: ChangeType | null = null;
      let beforeData: any = null;
      let targetFeature: Feature | undefined;

      if (!sourceFeature.parentFeatureId) {
        changeType = ChangeType.ADD;
        beforeData = null;
      } else {
        targetFeature = targetFeaturesMap.get(sourceFeature.parentFeatureId);

        if (!targetFeature) {
          this.logger.warn(
            `Parent feature ${sourceFeature.parentFeatureId} not found in target branch`,
          );
          continue;
        }

        if (sourceFeature.status === FeatureStatus.DELETED) {
          changeType = ChangeType.DELETE;
          beforeData = {
            geometry: targetFeature.geometry,
            properties: targetFeature.properties,
            version: targetFeature.version,
            status: targetFeature.status,
          };
        } else if (sourceFeature.version > (sourceFeature.parentVersion || 0)) {
          changeType = ChangeType.MODIFY;
          beforeData = {
            geometry: targetFeature.geometry,
            properties: targetFeature.properties,
            version: targetFeature.version,
            status: targetFeature.status,
          };
        }
      }

      if (changeType !== null) {
        const featureChange = this.featureChangeRepo.create({
          mergeRequestId,
          featureId: sourceFeature.id,
          changeType,
          beforeData,
          afterData: {
            geometry: sourceFeature.geometry,
            properties: sourceFeature.properties,
            version: sourceFeature.version,
            status: sourceFeature.status,
          },
          hasConflict: false, // No conflict detection for draft
          conflictData: null,
        });

        await this.featureChangeRepo.save(featureChange);
      }
    }

    this.logger.log(
      `Tracked changes for draft merge request ${mergeRequestId}`,
    );
  }

  async deleteBranch(userId: string, branchId: string): Promise<Branch> {
    this.logger.log(`User ${userId} deleting branch: ${branchId}`);

    const branch = await this.branchRepo.findOne({
      where: { id: branchId },
      relations: ['createdBy'],
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (branch.createdById !== userId) {
      throw new ForbiddenException('Only the creator can delete this branch');
    }

    if (branch.isMain) {
      throw new BadRequestException('Cannot delete main branch');
    }

    if (branch.status === BranchStatus.DELETED) {
      throw new BadRequestException('Branch already deleted');
    }

    const activeMergeRequests = await this.mergeRequestRepo.count({
      where: {
        sourceBranchId: branchId,
        status: In([
          MergeRequestStatus.DRAFT,
          MergeRequestStatus.REVIEWING,
          MergeRequestStatus.PENDING,
          MergeRequestStatus.CONFLICT,
        ]),
      },
    });

    if (activeMergeRequests > 0) {
      throw new BadRequestException(
        'Cannot delete branch with active merge requests. Cancel the merge requests first.',
      );
    }

    branch.status = BranchStatus.DELETED;
    const savedBranch = await this.branchRepo.save(branch);

    this.logger.log(`Branch deleted: ${branchId}`);
    return savedBranch;
  }

  /**
   * Update merge request description (only creator can update)
   */
  async updateMergeRequest(
    userId: string,
    mergeRequestId: string,
    updateMergeRequestDto: UpdateMergeRequestDto,
  ): Promise<MergeRequest> {
    this.logger.log(`User ${userId} updating merge request: ${mergeRequestId}`);

    const mergeRequest = await this.mergeRequestRepo.findOne({
      where: { id: mergeRequestId },
      relations: ['sourceBranch', 'targetBranch', 'createdBy'],
    });

    if (!mergeRequest) {
      throw new NotFoundException('Merge request not found');
    }

    if (mergeRequest.createdById !== userId) {
      throw new ForbiddenException(
        'Only the creator can update this merge request',
      );
    }

    if (
      ![
        MergeRequestStatus.DRAFT,
        MergeRequestStatus.REVIEWING,
        MergeRequestStatus.CONFLICT,
      ].includes(mergeRequest.status)
    ) {
      throw new BadRequestException(
        'Can only update draft, reviewing, or conflict merge requests',
      );
    }

    if (updateMergeRequestDto.description !== undefined) {
      mergeRequest.description = updateMergeRequestDto.description;
    }

    const savedMR = await this.mergeRequestRepo.save(mergeRequest);

    this.logger.log(`Merge request updated: ${mergeRequestId}`);
    return await this.mergeRequestRepo.findOneOrFail({
      where: { id: savedMR.id },
      relations: ['sourceBranch', 'targetBranch', 'createdBy'],
    });
  }

  /**
   * Submit merge request for admin review (member action)
   */
  async submitMergeRequestForReview(
    userId: string,
    mergeRequestId: string,
  ): Promise<MergeRequest> {
    this.logger.log(
      `User ${userId} submitting merge request for review: ${mergeRequestId}`,
    );

    const mergeRequest = await this.mergeRequestRepo.findOne({
      where: { id: mergeRequestId },
      relations: ['sourceBranch', 'targetBranch', 'createdBy', 'changes'],
    });

    if (!mergeRequest) {
      throw new NotFoundException('Merge request not found');
    }

    if (mergeRequest.createdById !== userId) {
      throw new ForbiddenException(
        'Only the creator can submit this merge request for review',
      );
    }

    if (mergeRequest.status === MergeRequestStatus.DRAFT) {
      // Check if there are any changes
      if (!mergeRequest.changes || mergeRequest.changes.length === 0) {
        throw new BadRequestException(
          'Cannot submit merge request with no changes',
        );
      }

      const conflicts = await this.detectConflicts(
        mergeRequest.sourceBranchId,
        mergeRequest.targetBranchId,
      );

      if (conflicts.length > 0) {
        mergeRequest.status = MergeRequestStatus.CONFLICT;
        mergeRequest.conflicts = conflicts;
        await this.mergeRequestRepo.save(mergeRequest);

        await this.updateConflictsInChanges(mergeRequest.id, conflicts);

        throw new BadRequestException(
          `Cannot submit merge request with ${conflicts.length} unresolved conflicts. Please resolve them first.`,
        );
      }

      mergeRequest.status = MergeRequestStatus.REVIEWING;
    } else if (mergeRequest.status === MergeRequestStatus.CONFLICT) {
      const unresolvedConflicts = await this.featureChangeRepo.count({
        where: {
          mergeRequestId: mergeRequest.id,
          hasConflict: true,
        },
      });

      if (unresolvedConflicts > 0) {
        throw new BadRequestException(
          `Cannot submit merge request with ${unresolvedConflicts} unresolved conflicts`,
        );
      }

      mergeRequest.status = MergeRequestStatus.REVIEWING;
      mergeRequest.conflicts = [];
    } else {
      throw new BadRequestException(
        'Can only submit draft or resolved conflict merge requests for review',
      );
    }

    const savedMR = await this.mergeRequestRepo.save(mergeRequest);

    this.logger.log(`Merge request submitted for review: ${mergeRequestId}`);
    return await this.mergeRequestRepo.findOneOrFail({
      where: { id: savedMR.id },
      relations: ['sourceBranch', 'targetBranch', 'createdBy'],
    });
  }

  /**
   * Cancel a merge request (only creator can cancel)
   */
  async cancelMergeRequest(
    userId: string,
    mergeRequestId: string,
  ): Promise<MergeRequest> {
    this.logger.log(
      `User ${userId} cancelling merge request: ${mergeRequestId}`,
    );

    const mergeRequest = await this.mergeRequestRepo.findOne({
      where: { id: mergeRequestId },
      relations: ['sourceBranch', 'targetBranch', 'createdBy'],
    });

    if (!mergeRequest) {
      throw new NotFoundException('Merge request not found');
    }

    // Check if user is the creator
    if (mergeRequest.createdById !== userId) {
      throw new ForbiddenException(
        'Only the creator can cancel this merge request',
      );
    }

    // Can only cancel draft, reviewing, pending, or conflict merge requests
    if (
      ![
        MergeRequestStatus.DRAFT,
        MergeRequestStatus.REVIEWING,
        MergeRequestStatus.PENDING,
        MergeRequestStatus.CONFLICT,
      ].includes(mergeRequest.status)
    ) {
      throw new BadRequestException(
        'Can only cancel draft, reviewing, pending, or conflict merge requests',
      );
    }

    mergeRequest.status = MergeRequestStatus.CANCELLED;
    const savedMR = await this.mergeRequestRepo.save(mergeRequest);

    this.logger.log(`Merge request cancelled: ${mergeRequestId}`);
    return await this.mergeRequestRepo.findOneOrFail({
      where: { id: savedMR.id },
      relations: ['sourceBranch', 'targetBranch', 'createdBy'],
    });
  }

  /**
   * Update conflicts in changes after re-detection
   */
  private async updateConflictsInChanges(
    mergeRequestId: string,
    conflicts: any[],
  ): Promise<void> {
    for (const conflict of conflicts) {
      const change = await this.featureChangeRepo.findOne({
        where: {
          mergeRequestId,
          featureId: conflict.featureId,
        },
      });

      if (change) {
        change.hasConflict = true;
        change.conflictData = conflict;
        await this.featureChangeRepo.save(change);
      }
    }
  }

  /**
   * Detect conflicts between branches
   */
  private async detectConflicts(
    sourceBranchId: string,
    targetBranchId: string,
  ): Promise<any[]> {
    const conflicts: any[] = [];

    const sourceFeatures = await this.featureRepo.find({
      where: { branchId: sourceBranchId },
    });

    for (const sourceFeature of sourceFeatures) {
      if (!sourceFeature.parentFeatureId) {
        continue;
      }

      const targetFeature = await this.featureRepo.findOne({
        where: {
          id: sourceFeature.parentFeatureId,
          branchId: targetBranchId,
        },
      });

      if (!targetFeature) {
        conflicts.push({
          featureId: sourceFeature.id,
          parentFeatureId: sourceFeature.parentFeatureId,
          reason: 'Feature was deleted in main branch',
          type: 'deleted_in_target',
        });
        continue;
      }

      if (sourceFeature.status === FeatureStatus.DELETED) {
        if (targetFeature.version > (sourceFeature.parentVersion || 0)) {
          conflicts.push({
            featureId: sourceFeature.id,
            parentFeatureId: sourceFeature.parentFeatureId,
            reason:
              'Feature was modified in main branch but deleted in working branch',
            type: 'delete_modified_conflict',
            sourceVersion: sourceFeature.version,
            targetVersion: targetFeature.version,
            branchVersion: sourceFeature.parentVersion,
          });
        }
        continue;
      }

      const wasModifiedInBranch =
        sourceFeature.version > (sourceFeature.parentVersion || 0);
      const wasModifiedInMain =
        targetFeature.version > (sourceFeature.parentVersion || 0);

      if (wasModifiedInBranch && wasModifiedInMain) {
        conflicts.push({
          featureId: sourceFeature.id,
          parentFeatureId: sourceFeature.parentFeatureId,
          reason: 'Feature was modified in both main branch and working branch',
          type: 'concurrent_modification',
          sourceVersion: sourceFeature.version,
          targetVersion: targetFeature.version,
          branchVersion: sourceFeature.parentVersion, // Version when branched
        });
      }
    }

    this.logger.log(`Detected ${conflicts.length} conflicts`);
    return conflicts;
  }

  /**
   * Track changes for merge request
   */
  private async trackChanges(
    mergeRequestId: string,
    sourceBranchId: string,
    targetBranchId: string,
    conflicts: any[],
  ): Promise<void> {
    const sourceFeatures = await this.featureRepo.find({
      where: { branchId: sourceBranchId },
    });

    const targetFeaturesMap = new Map<string, Feature>();
    const targetFeatures = await this.featureRepo.find({
      where: { branchId: targetBranchId },
    });
    targetFeatures.forEach((f) => targetFeaturesMap.set(f.id, f));

    for (const sourceFeature of sourceFeatures) {
      let changeType: ChangeType | null = null;
      let beforeData: any = null;
      let targetFeature: Feature | undefined;
      let hasConflict = false;

      if (!sourceFeature.parentFeatureId) {
        changeType = ChangeType.ADD;
        beforeData = null;
      } else {
        targetFeature = targetFeaturesMap.get(sourceFeature.parentFeatureId);

        if (!targetFeature) {
          this.logger.warn(
            `Parent feature ${sourceFeature.parentFeatureId} not found in target branch`,
          );
          continue;
        }

        if (sourceFeature.status === FeatureStatus.DELETED) {
          changeType = ChangeType.DELETE;
          beforeData = {
            geometry: targetFeature.geometry,
            properties: targetFeature.properties,
            version: targetFeature.version,
            status: targetFeature.status,
          };
        } else if (sourceFeature.version > (sourceFeature.parentVersion || 0)) {
          changeType = ChangeType.MODIFY;
          beforeData = {
            geometry: targetFeature.geometry,
            properties: targetFeature.properties,
            version: targetFeature.version,
            status: targetFeature.status,
          };
        }
      }

      if (changeType !== null) {
        const conflict = conflicts.find(
          (c) => c.featureId === sourceFeature.id,
        );
        if (conflict) {
          hasConflict = true;
        }

        const featureChange = this.featureChangeRepo.create({
          mergeRequestId,
          featureId: sourceFeature.id,
          changeType,
          beforeData,
          afterData: {
            geometry: sourceFeature.geometry,
            properties: sourceFeature.properties,
            version: sourceFeature.version,
            status: sourceFeature.status,
          },
          hasConflict,
          conflictData: conflict || null,
        });

        await this.featureChangeRepo.save(featureChange);
      }
    }

    this.logger.log(`Tracked changes for merge request ${mergeRequestId}`);
  }

  async getBranchChanges(branchId: string): Promise<{
    hasChanges: boolean;
    changeCount: number;
    changes: Array<{
      feature: Feature;
      changeType: 'add' | 'modify' | 'delete';
      parentFeature?: Feature;
    }>;
  }> {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId },
    });

    if (!branch || branch.isMain) {
      throw new BadRequestException('Invalid branch');
    }

    if (!branch.branchedFrom) {
      throw new BadRequestException('Branch has no parent');
    }

    const changes: Array<{
      feature: Feature;
      changeType: 'add' | 'modify' | 'delete';
      parentFeature?: Feature;
    }> = [];

    const branchFeatures = await this.featureRepo.find({
      where: { branchId: branch.id },
    });

    for (const branchFeature of branchFeatures) {
      if (!branchFeature.parentFeatureId) {
        changes.push({
          feature: branchFeature,
          changeType: 'add',
        });
        continue;
      }

      const parentFeature = await this.featureRepo.findOne({
        where: {
          id: branchFeature.parentFeatureId,
          branchId: branch.branchedFrom,
        },
      });

      if (!parentFeature) {
        this.logger.warn(
          `Parent feature not found: ${branchFeature.parentFeatureId}`,
        );
        continue;
      }

      if (branchFeature.status === FeatureStatus.DELETED) {
        changes.push({
          feature: branchFeature,
          changeType: 'delete',
          parentFeature,
        });
        continue;
      }

      if (branchFeature.version > (branchFeature.parentVersion || 0)) {
        changes.push({
          feature: branchFeature,
          changeType: 'modify',
          parentFeature,
        });
      }
    }

    return {
      hasChanges: changes.length > 0,
      changeCount: changes.length,
      changes,
    };
  }

  /**
   * Check for updates in main branch (like git fetch)
   */
  async checkForUpdates(branchId: string): Promise<{
    hasUpdates: boolean;
    updatedCount: number;
    updates: Array<{
      feature: Feature;
      updateType: 'added_in_main' | 'modified_in_main' | 'deleted_in_main';
      branchVersion?: number;
      mainVersion?: number;
    }>;
  }> {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId },
    });

    if (!branch || branch.isMain || !branch.branchedFrom) {
      throw new BadRequestException('Invalid branch');
    }

    const mainBranch = await this.branchRepo.findOne({
      where: { id: branch.branchedFrom },
    });

    if (!mainBranch) {
      throw new NotFoundException('Main branch not found');
    }

    const updates: Array<{
      feature: Feature;
      updateType: 'added_in_main' | 'modified_in_main' | 'deleted_in_main';
      branchVersion?: number;
      mainVersion?: number;
    }> = [];

    const branchFeatures = await this.featureRepo.find({
      where: { branchId: branch.id },
    });

    const branchFeatureMap = new Map<string, Feature>();
    branchFeatures.forEach((f) => {
      if (f.parentFeatureId) {
        branchFeatureMap.set(f.parentFeatureId, f);
      }
    });

    const mainFeatures = await this.featureRepo.find({
      where: {
        branchId: mainBranch.id,
        status: FeatureStatus.ACTIVE,
      },
    });

    for (const mainFeature of mainFeatures) {
      if (mainFeature.createdAt > branch.createdAt) {
        updates.push({
          feature: mainFeature,
          updateType: 'added_in_main',
        });
        continue;
      }

      const branchFeature = branchFeatureMap.get(mainFeature.id);

      if (branchFeature) {
        if (mainFeature.version > (branchFeature.parentVersion || 0)) {
          updates.push({
            feature: mainFeature,
            updateType: 'modified_in_main',
            branchVersion: branchFeature.version,
            mainVersion: mainFeature.version,
          });
        }
      }
    }

    for (const branchFeature of branchFeatures) {
      if (!branchFeature.parentFeatureId) continue;

      const mainFeature = await this.featureRepo.findOne({
        where: {
          id: branchFeature.parentFeatureId,
          branchId: mainBranch.id,
        },
      });

      if (!mainFeature || mainFeature.status === FeatureStatus.DELETED) {
        updates.push({
          feature: branchFeature,
          updateType: 'deleted_in_main',
        });
      }
    }

    return {
      hasUpdates: updates.length > 0,
      updatedCount: updates.length,
      updates,
    };
  }

  /**
   * Approve and merge request (admin only)
   */
  async approveMergeRequest(
    adminId: string,
    mergeRequestId: string,
    user: User,
  ): Promise<MergeRequest> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can approve merge requests');
    }

    this.logger.log(
      `Admin ${adminId} approving merge request: ${mergeRequestId}`,
    );

    const mergeRequest = await this.mergeRequestRepo.findOne({
      where: { id: mergeRequestId },
      relations: ['sourceBranch', 'targetBranch', 'changes'],
    });

    if (!mergeRequest) {
      throw new NotFoundException('Merge request not found');
    }

    if (mergeRequest.status !== MergeRequestStatus.REVIEWING) {
      throw new BadRequestException(
        'Can only approve merge requests that are in reviewing status',
      );
    }

    const unresolvedConflicts = await this.featureChangeRepo.count({
      where: {
        mergeRequestId: mergeRequest.id,
        hasConflict: true,
      },
    });

    if (unresolvedConflicts > 0) {
      throw new BadRequestException(
        `Cannot approve merge request with ${unresolvedConflicts} unresolved conflicts`,
      );
    }

    mergeRequest.status = MergeRequestStatus.PENDING;
    await this.mergeRequestRepo.save(mergeRequest);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const change of mergeRequest.changes) {
        const sourceFeature = await this.featureRepo.findOne({
          where: { id: change.featureId },
        });

        if (!sourceFeature) {
          this.logger.warn(`Source feature not found: ${change.featureId}`);
          continue;
        }

        if (change.changeType === ChangeType.ADD) {
          const newFeature = this.featureRepo.create({
            datasetId: sourceFeature.datasetId,
            branchId: mergeRequest.targetBranchId,
            geometry: sourceFeature.geometry,
            properties: sourceFeature.properties,
            status: FeatureStatus.ACTIVE,
            version: 1,
            parentFeatureId: null,
            createdById: sourceFeature.createdById,
          });
          await queryRunner.manager.save(newFeature);
        } else if (change.changeType === ChangeType.MODIFY) {
          if (!sourceFeature.parentFeatureId) {
            this.logger.warn(`Parent Feature id is empty for modify change`);
            continue;
          }

          const targetFeature = await queryRunner.manager.findOne(Feature, {
            where: { id: sourceFeature.parentFeatureId },
          });

          if (targetFeature) {
            targetFeature.geometry = sourceFeature.geometry;
            targetFeature.properties = sourceFeature.properties;
            targetFeature.version += 1;
            targetFeature.updatedById = adminId;
            targetFeature.updatedAt = new Date();
            await queryRunner.manager.save(targetFeature);
          }
        } else if (change.changeType === ChangeType.DELETE) {
          if (!sourceFeature.parentFeatureId) {
            this.logger.warn(`Parent Feature id is empty for delete change`);
            continue;
          }

          const targetFeature = await queryRunner.manager.findOne(Feature, {
            where: { id: sourceFeature.parentFeatureId },
          });

          if (targetFeature) {
            targetFeature.status = FeatureStatus.DELETED;
            targetFeature.updatedById = adminId;
            targetFeature.updatedAt = new Date();
            await queryRunner.manager.save(targetFeature);
          }
        }
      }

      mergeRequest.status = MergeRequestStatus.APPROVED;
      mergeRequest.reviewedById = adminId;
      mergeRequest.reviewedAt = new Date();
      await queryRunner.manager.save(mergeRequest);

      const sourceBranch = await queryRunner.manager.findOne(Branch, {
        where: { id: mergeRequest.sourceBranchId },
      });
      if (sourceBranch) {
        sourceBranch.status = BranchStatus.MERGED;
        await queryRunner.manager.save(sourceBranch);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Merge request approved: ${mergeRequestId}`);

      return await this.mergeRequestRepo.findOneOrFail({
        where: { id: mergeRequestId },
        relations: ['sourceBranch', 'targetBranch', 'createdBy', 'reviewedBy'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to approve merge request: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reject merge request (admin only)
   */
  async rejectMergeRequest(
    adminId: string,
    mergeRequestId: string,
    comment: string,
    user: User,
  ): Promise<MergeRequest> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can reject merge requests');
    }

    this.logger.log(
      `Admin ${adminId} rejecting merge request: ${mergeRequestId}`,
    );

    const mergeRequest = await this.mergeRequestRepo.findOne({
      where: { id: mergeRequestId },
      relations: ['sourceBranch', 'targetBranch'],
    });

    if (!mergeRequest) {
      throw new NotFoundException('Merge request not found');
    }

    if (mergeRequest.status === MergeRequestStatus.APPROVED) {
      throw new BadRequestException(
        'Cannot reject already approved merge request',
      );
    }

    mergeRequest.status = MergeRequestStatus.REJECTED;
    mergeRequest.reviewedById = adminId;
    mergeRequest.reviewComment = comment;
    mergeRequest.reviewedAt = new Date();

    const savedMR = await this.mergeRequestRepo.save(mergeRequest);
    this.logger.log(`Merge request rejected: ${mergeRequestId}`);

    return await this.mergeRequestRepo.findOneOrFail({
      where: { id: savedMR.id },
      relations: ['sourceBranch', 'targetBranch', 'createdBy', 'reviewedBy'],
    });
  }

  /**
   * Get merge requests for dataset
   */
  async getMergeRequests(
    datasetId: string,
    status?: MergeRequestStatus,
  ): Promise<MergeRequest[]> {
    const whereClause: any = {
      sourceBranch: { datasetId },
    };

    if (status) {
      whereClause.status = status;
    }

    return await this.mergeRequestRepo.find({
      where: whereClause,
      relations: ['sourceBranch', 'targetBranch', 'createdBy', 'reviewedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single merge request
   */
  async getMergeRequestById(mergeRequestId: string): Promise<MergeRequest> {
    const mergeRequest = await this.mergeRequestRepo.findOne({
      where: { id: mergeRequestId },
      relations: [
        'sourceBranch',
        'targetBranch',
        'createdBy',
        'reviewedBy',
        'changes',
      ],
    });

    if (!mergeRequest) {
      throw new NotFoundException('Merge request not found');
    }

    return mergeRequest;
  }

  /**
   * Basic geometry validation
   */
  private validateGeometry(geometry: any): void {
    if (!geometry || !geometry.type) {
      throw new BadRequestException('Invalid geometry: missing type');
    }

    if (!geometry.coordinates) {
      throw new BadRequestException('Invalid geometry: missing coordinates');
    }

    const validTypes = [
      'Point',
      'LineString',
      'Polygon',
      'MultiPoint',
      'MultiLineString',
      'MultiPolygon',
    ];
    if (!validTypes.includes(geometry.type)) {
      throw new BadRequestException(`Invalid geometry type: ${geometry.type}`);
    }
  }
}
