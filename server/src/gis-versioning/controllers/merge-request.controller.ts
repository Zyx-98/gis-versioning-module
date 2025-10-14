import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { GISVersioningService } from '../services/gis-versioning.service';
import { ConflictResolutionService } from '../services/conflict-resolution.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  CreateMergeRequestDto,
  ReviewMergeRequestDto,
  UpdateMergeRequestDto,
} from '../dto';
import { UserRole } from 'src/database/enums';

@ApiTags('Merge Requests')
@ApiBearerAuth('JWT-auth')
@Controller('merge-requests')
@UseGuards(JwtAuthGuard)
export class MergeRequestController {
  constructor(
    private readonly gisService: GISVersioningService,
    private readonly conflictService: ConflictResolutionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new merge request (creates as draft)' })
  @ApiResponse({
    status: 201,
    description: 'Merge request created successfully as draft',
    schema: {
      example: {
        id: 'uuid',
        status: 'draft',
        conflicts: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Cannot create MR from main branch',
  })
  async createMergeRequest(
    @Request() req,
    @Body() createMergeRequestDto: CreateMergeRequestDto,
  ) {
    return await this.gisService.createMergeRequest(
      req.user.id,
      createMergeRequestDto,
    );
  }

  @Get(':mergeRequestId')
  @ApiOperation({ summary: 'Get merge request details' })
  @ApiResponse({
    status: 200,
    description: 'Merge request retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Merge request not found' })
  async getMergeRequest(@Param('mergeRequestId') mergeRequestId: string) {
    return await this.gisService.getMergeRequestById(mergeRequestId);
  }

  @Put(':mergeRequestId')
  @ApiOperation({
    summary:
      'Update merge request description (only creator can update draft/reviewing MR)',
  })
  @ApiResponse({
    status: 200,
    description: 'Merge request updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only creator can update their merge request',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Cannot update approved/rejected/cancelled merge request',
  })
  @ApiResponse({ status: 404, description: 'Merge request not found' })
  async updateMergeRequest(
    @Request() req,
    @Param('mergeRequestId') mergeRequestId: string,
    @Body() updateMergeRequestDto: UpdateMergeRequestDto,
  ) {
    return await this.gisService.updateMergeRequest(
      req.user.id,
      mergeRequestId,
      updateMergeRequestDto,
    );
  }

  @Post(':mergeRequestId/submit-for-review')
  @ApiOperation({
    summary: 'Submit merge request for admin review (member action)',
  })
  @ApiResponse({
    status: 200,
    description: 'Merge request submitted for review',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only creator can submit their merge request',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - MR must be in draft status or have unresolved conflicts',
  })
  @ApiResponse({ status: 404, description: 'Merge request not found' })
  async submitForReview(
    @Request() req,
    @Param('mergeRequestId') mergeRequestId: string,
  ) {
    return await this.gisService.submitMergeRequestForReview(
      req.user.id,
      mergeRequestId,
    );
  }

  @Post(':mergeRequestId/cancel')
  @ApiOperation({
    summary: 'Cancel a pending merge request (only creator can cancel)',
  })
  @ApiResponse({
    status: 200,
    description: 'Merge request cancelled successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only creator can cancel their merge request',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Can only cancel draft/reviewing/pending/conflict merge requests',
  })
  @ApiResponse({ status: 404, description: 'Merge request not found' })
  async cancelMergeRequest(
    @Request() req,
    @Param('mergeRequestId') mergeRequestId: string,
  ) {
    return await this.gisService.cancelMergeRequest(
      req.user.id,
      mergeRequestId,
    );
  }

  @Get(':mergeRequestId/changes')
  @ApiOperation({ summary: 'Get all changes in a merge request' })
  @ApiResponse({ status: 200, description: 'Changes retrieved successfully' })
  async getMergeRequestChanges(
    @Param('mergeRequestId') mergeRequestId: string,
  ) {
    const mergeRequest =
      await this.gisService.getMergeRequestById(mergeRequestId);
    return mergeRequest.changes;
  }

  @Get(':mergeRequestId/conflicts')
  @ApiOperation({ summary: 'Get all conflicts in a merge request' })
  @ApiResponse({ status: 200, description: 'Conflicts retrieved successfully' })
  async getConflicts(@Param('mergeRequestId') mergeRequestId: string) {
    return await this.conflictService.getConflictsByMergeRequest(
      mergeRequestId,
    );
  }

  @Get(':mergeRequestId/statistics')
  @ApiOperation({ summary: 'Get conflict statistics for a merge request' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      example: {
        totalChanges: 10,
        totalConflicts: 2,
        resolvedConflicts: 0,
        pendingConflicts: 2,
        resolutionProgress: 0,
      },
    },
  })
  async getConflictStatistics(@Param('mergeRequestId') mergeRequestId: string) {
    return await this.conflictService.getConflictStatistics(mergeRequestId);
  }

  @Post(':mergeRequestId/approve')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Approve a merge request (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Merge request approved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Cannot approve with unresolved conflicts or must be in reviewing status',
  })
  @ApiResponse({ status: 404, description: 'Merge request not found' })
  async approveMergeRequest(
    @Request() req,
    @Param('mergeRequestId') mergeRequestId: string,
  ) {
    return await this.gisService.approveMergeRequest(
      req.user.id,
      mergeRequestId,
      req.user,
    );
  }

  @Post(':mergeRequestId/reject')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Reject a merge request (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Merge request rejected successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Merge request not found' })
  async rejectMergeRequest(
    @Request() req,
    @Param('mergeRequestId') mergeRequestId: string,
    @Body() reviewDto: ReviewMergeRequestDto,
  ) {
    return await this.gisService.rejectMergeRequest(
      req.user.id,
      mergeRequestId,
      reviewDto.comment,
      req.user,
    );
  }

  @Post(':mergeRequestId/conflicts/:changeId/resolve')
  @ApiOperation({ summary: 'Resolve a specific conflict' })
  @ApiResponse({ status: 200, description: 'Conflict resolved successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid resolution strategy',
  })
  @ApiResponse({ status: 404, description: 'Conflict not found' })
  async resolveConflict(
    @Param('changeId') changeId: string,
    @Body()
    body: {
      resolution: 'keep_source' | 'keep_target' | 'manual';
      manualData?: any;
    },
  ) {
    return await this.conflictService.resolveConflict(
      changeId,
      body.resolution,
      body.manualData,
    );
  }

  @Post(':mergeRequestId/conflicts/auto-resolve')
  @ApiOperation({
    summary: 'Auto-resolve all conflicts with a single strategy',
  })
  @ApiResponse({
    status: 200,
    description: 'Conflicts resolved successfully',
    schema: {
      example: {
        resolvedCount: 5,
        message: 'Successfully resolved 5 conflicts',
      },
    },
  })
  async autoResolveConflicts(
    @Param('mergeRequestId') mergeRequestId: string,
    @Body() body: { strategy: 'keep_source' | 'keep_target' },
  ) {
    const resolvedCount = await this.conflictService.autoResolveConflicts(
      mergeRequestId,
      body.strategy,
    );

    return {
      resolvedCount,
      message: `Successfully resolved ${resolvedCount} conflicts`,
    };
  }

  @Get('conflicts/:changeId/details')
  @ApiOperation({ summary: 'Get detailed information about a conflict' })
  @ApiResponse({
    status: 200,
    description: 'Conflict details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Conflict not found' })
  async getConflictDetails(@Param('changeId') changeId: string) {
    return await this.conflictService.getConflictDetails(changeId);
  }

  @Post('conflicts/:changeId/merge-properties')
  @ApiOperation({ summary: 'Smart merge properties from both versions' })
  @ApiResponse({ status: 200, description: 'Properties merged successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid conflict or no conflict',
  })
  async mergeProperties(@Param('changeId') changeId: string) {
    return await this.conflictService.mergeProperties(changeId);
  }

  @Get('features/compare')
  @ApiOperation({ summary: 'Compare two feature versions' })
  @ApiQuery({
    name: 'sourceId',
    required: true,
    description: 'Source feature ID',
  })
  @ApiQuery({
    name: 'targetId',
    required: true,
    description: 'Target feature ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Comparison completed successfully',
  })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  async compareFeatures(
    @Query('sourceId') sourceId: string,
    @Query('targetId') targetId: string,
  ) {
    return await this.conflictService.compareFeatureVersions(
      sourceId,
      targetId,
    );
  }
}
