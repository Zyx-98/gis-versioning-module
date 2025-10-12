import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, DeepPartial } from 'typeorm';
import {
  CreateDatasetDto,
  CheckoutBranchDto,
  CreateFeatureDto,
  UpdateFeatureDto,
  CreateMergeRequestDto,
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
          parentFeatureId: feature.id, // Track the original feature
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

    // Validate geometry (basic check)
    this.validateGeometry(createFeatureDto.geometry);

    const feature = this.featureRepo.create({
      datasetId: branch.datasetId,
      branchId: branch.id,
      geometry: createFeatureDto.geometry,
      properties: createFeatureDto.properties || {},
      status: FeatureStatus.ACTIVE,
      version: 1,
      parentFeatureId: null, // New feature, no parent
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
      relations: ['branch'],
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
      relations: ['branch'],
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

    feature.status = FeatureStatus.DELETED;
    feature.updatedById = userId;
    feature.updatedAt = new Date();

    const savedFeature = await this.featureRepo.save(feature);
    this.logger.log(`Feature deleted: ${featureId}`);

    return savedFeature;
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

    const targetBranch = await this.branchRepo.findOne({
      where: { id: sourceBranch.branchedFrom, isMain: true },
    });

    if (!targetBranch) {
      throw new NotFoundException('Target main branch not found');
    }

    // Detect conflicts
    const conflicts = await this.detectConflicts(
      sourceBranchId,
      targetBranch.id,
    );

    const mergeRequest = this.mergeRequestRepo.create({
      sourceBranchId: sourceBranch.id,
      targetBranchId: targetBranch.id,
      description,
      status:
        conflicts.length > 0
          ? MergeRequestStatus.CONFLICT
          : MergeRequestStatus.PENDING,
      createdById: userId,
      conflicts: conflicts.length > 0 ? conflicts : [],
    });

    const savedMR = await this.mergeRequestRepo.save(mergeRequest);

    // Track all changes
    await this.trackChanges(
      savedMR.id,
      sourceBranchId,
      targetBranch.id,
      conflicts,
    );

    this.logger.log(
      `Merge request created: ${savedMR.id}, conflicts: ${conflicts.length}`,
    );

    return await this.mergeRequestRepo.findOneOrFail({
      where: { id: savedMR.id },
      relations: ['sourceBranch', 'targetBranch', 'createdBy', 'changes'],
    });
  }

  /**
   * Detect conflicts between branches
   */
  private async detectConflicts(
    sourceBranchId: string,
    targetBranchId: string,
  ): Promise<any[]> {
    const conflicts: any[] = [];

    // Get features from source branch
    const sourceFeatures = await this.featureRepo.find({
      where: { branchId: sourceBranchId },
    });

    for (const sourceFeature of sourceFeatures) {
      if (!sourceFeature.parentFeatureId) {
        // New feature, no conflict possible
        continue;
      }

      // Find corresponding feature in target (main) branch
      const targetFeature = await this.featureRepo.findOne({
        where: {
          id: sourceFeature.parentFeatureId,
          branchId: targetBranchId,
        },
      });

      if (!targetFeature) {
        // Parent was deleted in main branch
        conflicts.push({
          featureId: sourceFeature.id,
          parentFeatureId: sourceFeature.parentFeatureId,
          reason: 'Feature was deleted in main branch',
          type: 'deleted_in_target',
        });
        continue;
      }

      // Check if target has been updated after source was created
      if (
        targetFeature.version > sourceFeature.version ||
        targetFeature.updatedAt > sourceFeature.updatedAt
      ) {
        conflicts.push({
          featureId: sourceFeature.id,
          parentFeatureId: sourceFeature.parentFeatureId,
          reason: 'Feature has been updated in main branch',
          type: 'modified_in_target',
          sourceVersion: sourceFeature.version,
          targetVersion: targetFeature.version,
        });
      }
    }

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
      let changeType: ChangeType;
      let beforeData: DeepPartial<Feature> | null = null;
      let hasConflict = false;

      if (!sourceFeature.parentFeatureId) {
        // New feature added
        changeType = ChangeType.ADD;
      } else if (sourceFeature.status === FeatureStatus.DELETED) {
        // Feature deleted
        changeType = ChangeType.DELETE;
        const targetFeature =
          targetFeaturesMap.get(sourceFeature.parentFeatureId) || null;
        beforeData = targetFeature
          ? {
              geometry: targetFeature.geometry,
              properties: targetFeature.properties,
              version: targetFeature.version,
            }
          : null;
      } else {
        // Feature modified
        changeType = ChangeType.MODIFY;
        const targetFeature = targetFeaturesMap.get(
          sourceFeature.parentFeatureId,
        );
        beforeData = targetFeature
          ? {
              geometry: targetFeature.geometry,
              properties: targetFeature.properties,
              version: targetFeature.version,
            }
          : null;
      }

      // Check if this feature has a conflict
      const conflict = conflicts.find((c) => c.featureId === sourceFeature.id);
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

  /**
   * Check for updates in main branch (like git fetch)
   */
  async checkForUpdates(branchId: string): Promise<{
    hasUpdates: boolean;
    updatedCount: number;
    updates: Feature[];
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

    // Get features that changed in main after branch creation
    const updatedFeatures = await this.featureRepo
      .createQueryBuilder('feature')
      .where('feature.branchId = :mainBranchId', {
        mainBranchId: mainBranch.id,
      })
      .andWhere('feature.updatedAt > :branchCreatedAt', {
        branchCreatedAt: branch.createdAt,
      })
      .getMany();

    return {
      hasUpdates: updatedFeatures.length > 0,
      updatedCount: updatedFeatures.length,
      updates: updatedFeatures,
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

    if (mergeRequest.status === MergeRequestStatus.CONFLICT) {
      throw new BadRequestException('Cannot merge with unresolved conflicts');
    }

    if (mergeRequest.status === MergeRequestStatus.APPROVED) {
      throw new BadRequestException('Merge request already approved');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Apply changes to main branch
      for (const change of mergeRequest.changes) {
        const sourceFeature = await this.featureRepo.findOne({
          where: { id: change.featureId },
        });

        if (!sourceFeature) {
          this.logger.warn(`Source feature not found: ${change.featureId}`);
          continue;
        }

        if (!sourceFeature.parentFeatureId) {
          this.logger.warn(`Parent Feature id is empty`);
          continue;
        }

        if (change.changeType === ChangeType.ADD) {
          // Add new feature to main
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
          // Update existing feature in main
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
          // Delete feature from main
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

      // Update merge request status
      mergeRequest.status = MergeRequestStatus.APPROVED;
      mergeRequest.reviewedById = adminId;
      mergeRequest.reviewedAt = new Date();
      await queryRunner.manager.save(mergeRequest);

      // Update source branch status
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

    // Additional validation can be added here
    // For example, check coordinate format, polygon closure, etc.
  }
}
