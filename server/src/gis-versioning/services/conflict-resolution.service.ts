import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FeatureChange } from 'src/database/entities/feature-change.entity';
import { Feature } from 'src/database/entities/feature.entity';
import { MergeRequest } from 'src/database/entities/merge-request.entity';
import { ChangeType, MergeRequestStatus } from 'src/database/enums';
import { Repository } from 'typeorm';

@Injectable()
export class ConflictResolutionService {
  private readonly logger = new Logger(ConflictResolutionService.name);

  constructor(
    @InjectRepository(Feature)
    private featureRepo: Repository<Feature>,
    @InjectRepository(FeatureChange)
    private featureChangeRepo: Repository<FeatureChange>,
    @InjectRepository(MergeRequest)
    private mergeRequestRepo: Repository<MergeRequest>,
  ) {}

  /**
   * Resolve conflicts by allowing user to choose which version to keep
   */
  async resolveConflict(
    changeId: string,
    resolution: 'keep_source' | 'keep_target' | 'manual',
    manualData?: any,
  ): Promise<FeatureChange> {
    this.logger.log(
      `Resolving conflict for change: ${changeId}, strategy: ${resolution}`,
    );

    const change = await this.featureChangeRepo.findOne({
      where: { id: changeId },
      relations: ['mergeRequest'],
    });

    if (!change) {
      throw new NotFoundException('Feature change not found');
    }

    if (!change.hasConflict) {
      throw new BadRequestException('This change has no conflict');
    }

    if (resolution === 'keep_source') {
      change.conflictData = null;
      change.hasConflict = false;
      this.logger.log('Conflict resolved: keeping source version');
    } else if (resolution === 'keep_target') {
      change.afterData = change.beforeData;
      change.conflictData = null;
      change.hasConflict = false;
      this.logger.log('Conflict resolved: keeping target version');
    } else if (resolution === 'manual' && manualData) {
      change.afterData = manualData;
      change.conflictData = null;
      change.hasConflict = false;
      this.logger.log('Conflict resolved: manual resolution');
    } else {
      throw new BadRequestException(
        'Invalid resolution strategy or missing manual data',
      );
    }

    await this.featureChangeRepo.save(change);

    await this.checkAndUpdateMergeRequestStatus(change.mergeRequestId);

    return change;
  }

  /**
   * Check if all conflicts are resolved and update merge request status
   */
  private async checkAndUpdateMergeRequestStatus(
    mergeRequestId: string,
  ): Promise<void> {
    const remainingConflicts = await this.featureChangeRepo.count({
      where: {
        mergeRequestId,
        hasConflict: true,
      },
    });

    if (remainingConflicts === 0) {
      const mergeRequest = await this.mergeRequestRepo.findOne({
        where: { id: mergeRequestId },
      });

      if (mergeRequest && mergeRequest.status === MergeRequestStatus.CONFLICT) {
        mergeRequest.status = MergeRequestStatus.PENDING;
        mergeRequest.conflicts = [];
        await this.mergeRequestRepo.save(mergeRequest);
        this.logger.log(
          `All conflicts resolved for merge request: ${mergeRequestId}`,
        );
      }
    }
  }

  /**
   * Get conflict details for visualization
   */
  async getConflictDetails(changeId: string): Promise<any> {
    const change = await this.featureChangeRepo.findOne({
      where: { id: changeId },
    });

    if (!change) {
      throw new NotFoundException('Feature change not found');
    }

    if (!change.hasConflict) {
      return null;
    }

    return {
      changeId: change.id,
      featureId: change.featureId,
      changeType: change.changeType,
      sourceVersion: change.afterData,
      targetVersion: change.beforeData,
      conflictInfo: change.conflictData,
      suggestions: this.generateConflictSuggestions(change),
    };
  }

  /**
   * Generate suggestions for resolving conflicts
   */
  private generateConflictSuggestions(change: FeatureChange): any[] {
    const suggestions: Array<{
      type: string;
      description: string;
      action: string;
    }> = [];

    if (change.changeType === ChangeType.MODIFY) {
      suggestions.push({
        type: 'keep_source',
        description: 'Keep your changes and overwrite main branch',
        action: 'Replaces the main branch version with your version',
      });

      suggestions.push({
        type: 'keep_target',
        description: 'Discard your changes and keep main branch version',
        action: 'Abandons your changes and keeps the main branch version',
      });

      suggestions.push({
        type: 'merge_properties',
        description: 'Merge properties from both versions',
        action: 'Combines non-conflicting properties from both versions',
      });

      suggestions.push({
        type: 'manual',
        description: 'Manually edit and resolve the conflict',
        action: 'Allows you to create a custom resolution',
      });
    } else if (change.changeType === ChangeType.DELETE) {
      suggestions.push({
        type: 'keep_source',
        description: 'Confirm deletion',
        action: 'Deletes the feature from main branch',
      });

      suggestions.push({
        type: 'keep_target',
        description: 'Keep the feature (cancel deletion)',
        action: 'Retains the updated feature from main branch',
      });
    }

    return suggestions;
  }

  /**
   * Auto-resolve conflicts based on strategy
   */
  async autoResolveConflicts(
    mergeRequestId: string,
    strategy: 'keep_source' | 'keep_target',
  ): Promise<number> {
    this.logger.log(
      `Auto-resolving conflicts for MR ${mergeRequestId} with strategy: ${strategy}`,
    );

    const changes = await this.featureChangeRepo.find({
      where: { mergeRequestId, hasConflict: true },
    });

    let resolvedCount = 0;

    for (const change of changes) {
      if (strategy === 'keep_source') {
        change.hasConflict = false;
        change.conflictData = null;
      } else {
        change.afterData = change.beforeData;
        change.hasConflict = false;
        change.conflictData = null;
      }

      await this.featureChangeRepo.save(change);
      resolvedCount++;
    }

    await this.checkAndUpdateMergeRequestStatus(mergeRequestId);

    this.logger.log(`Auto-resolved ${resolvedCount} conflicts`);
    return resolvedCount;
  }

  /**
   * Get all conflicts for a merge request
   */
  async getConflictsByMergeRequest(
    mergeRequestId: string,
  ): Promise<FeatureChange[]> {
    return await this.featureChangeRepo.find({
      where: {
        mergeRequestId,
        hasConflict: true,
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Merge properties from both versions (smart merge)
   */
  async mergeProperties(changeId: string): Promise<FeatureChange> {
    const change = await this.featureChangeRepo.findOne({
      where: { id: changeId },
    });

    if (!change || !change.hasConflict) {
      throw new BadRequestException('Invalid change or no conflict');
    }

    const sourceProps = change.afterData?.properties || {};
    const targetProps = change.beforeData?.properties || {};

    // Merge properties: target properties first, then override with source
    const mergedProperties = {
      ...targetProps,
      ...sourceProps,
    };

    // For geometry, we'll use the source version by default
    const mergedData = {
      geometry: change.afterData?.geometry || change.beforeData?.geometry,
      properties: mergedProperties,
      version: (change.afterData?.version || 0) + 1,
    };

    change.afterData = mergedData;
    change.hasConflict = false;
    change.conflictData = null;

    await this.featureChangeRepo.save(change);
    await this.checkAndUpdateMergeRequestStatus(change.mergeRequestId);

    this.logger.log(`Properties merged for change: ${changeId}`);
    return change;
  }

  /**
   * Compare two feature versions
   */
  async compareFeatureVersions(
    sourceFeatureId: string,
    targetFeatureId: string,
  ): Promise<any> {
    const sourceFeature = await this.featureRepo.findOne({
      where: { id: sourceFeatureId },
    });

    const targetFeature = await this.featureRepo.findOne({
      where: { id: targetFeatureId },
    });

    if (!sourceFeature || !targetFeature) {
      throw new NotFoundException('Feature not found');
    }

    // Compare geometries
    const geometryEqual =
      JSON.stringify(sourceFeature.geometry) ===
      JSON.stringify(targetFeature.geometry);

    // Compare properties
    const sourceProps = sourceFeature.properties || {};
    const targetProps = targetFeature.properties || {};

    const allKeys = new Set([
      ...Object.keys(sourceProps),
      ...Object.keys(targetProps),
    ]);

    const propertyDifferences = {
      added: [] as string[],
      removed: [] as string[],
      modified: [] as Array<{ key: string; source: any; target: any }>,
    };

    for (const key of allKeys) {
      if (!(key in targetProps)) {
        propertyDifferences.added.push(key);
      } else if (!(key in sourceProps)) {
        propertyDifferences.removed.push(key);
      } else if (sourceProps[key] !== targetProps[key]) {
        propertyDifferences.modified.push({
          key,
          source: sourceProps[key],
          target: targetProps[key],
        });
      }
    }

    return {
      sourceFeatureId,
      targetFeatureId,
      geometryEqual,
      geometryDiff: geometryEqual
        ? null
        : {
            source: sourceFeature.geometry,
            target: targetFeature.geometry,
          },
      propertyDifferences,
      versionDiff: {
        source: sourceFeature.version,
        target: targetFeature.version,
      },
    };
  }

  /**
   * Get conflict statistics for a merge request
   */
  async getConflictStatistics(mergeRequestId: string): Promise<any> {
    const allChanges = await this.featureChangeRepo.find({
      where: { mergeRequestId },
    });

    const conflictChanges = allChanges.filter((c) => c.hasConflict);
    const resolvedChanges = allChanges.filter((c) => !c.hasConflict);

    const changeTypeBreakdown = {
      add: allChanges.filter((c) => c.changeType === ChangeType.ADD).length,
      modify: allChanges.filter((c) => c.changeType === ChangeType.MODIFY)
        .length,
      delete: allChanges.filter((c) => c.changeType === ChangeType.DELETE)
        .length,
    };

    const conflictTypeBreakdown = {
      modifyConflicts: conflictChanges.filter(
        (c) => c.changeType === ChangeType.MODIFY,
      ).length,
      deleteConflicts: conflictChanges.filter(
        (c) => c.changeType === ChangeType.DELETE,
      ).length,
    };

    return {
      totalChanges: allChanges.length,
      totalConflicts: conflictChanges.length,
      resolvedConflicts: allChanges.length - conflictChanges.length,
      pendingConflicts: conflictChanges.length,
      changeTypeBreakdown,
      conflictTypeBreakdown,
      resolutionProgress:
        allChanges.length > 0
          ? Math.round((resolvedChanges.length / allChanges.length) * 100)
          : 0,
    };
  }
}
