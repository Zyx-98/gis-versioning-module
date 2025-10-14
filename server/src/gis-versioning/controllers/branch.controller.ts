import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { GISVersioningService } from '../services/gis-versioning.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CheckoutBranchDto, CreateFeatureDto, UpdateFeatureDto } from '../dto';

@ApiTags('Branches')
@ApiBearerAuth('JWT-auth')
@Controller('branches')
@UseGuards(JwtAuthGuard)
export class BranchController {
  constructor(private readonly gisService: GISVersioningService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Checkout a new branch from main' })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input or branch already exists',
  })
  @ApiResponse({ status: 404, description: 'Dataset or main branch not found' })
  async checkoutBranch(
    @Request() req,
    @Body() checkoutBranchDto: CheckoutBranchDto,
  ) {
    return await this.gisService.checkoutBranch(req.user.id, checkoutBranchDto);
  }

  @Get(':branchId')
  @ApiOperation({ summary: 'Get a single branch by ID' })
  @ApiResponse({ status: 200, description: 'Branch retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async getBranch(@Param('branchId') branchId: string) {
    return await this.gisService.getBranchById(branchId);
  }

  @Delete(':branchId')
  @ApiOperation({
    summary: 'Delete a branch (only creator can delete their own branch)',
  })
  @ApiResponse({ status: 200, description: 'Branch deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only creator can delete their branch',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Cannot delete main branch or branch with active merge requests',
  })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async deleteBranch(@Request() req, @Param('branchId') branchId: string) {
    return await this.gisService.deleteBranch(req.user.id, branchId);
  }

  @Get(':branchId/features')
  @ApiOperation({ summary: 'Get all features in a branch' })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Include deleted features in the result',
  })
  @ApiResponse({ status: 200, description: 'Features retrieved successfully' })
  async getBranchFeatures(
    @Param('branchId') branchId: string,
    @Query('includeDeleted', new DefaultValuePipe(false), ParseBoolPipe)
    includeDeleted: boolean,
  ) {
    return await this.gisService.getBranchFeatures(branchId, includeDeleted);
  }

  @Get(':branchId/check-updates')
  @ApiOperation({ summary: 'Check if main branch has been updated' })
  @ApiResponse({
    status: 200,
    description: 'Update check completed',
    schema: {
      example: {
        hasUpdates: true,
        updatedCount: 5,
        updates: [],
      },
    },
  })
  async checkForUpdates(@Param('branchId') branchId: string) {
    return await this.gisService.checkForUpdates(branchId);
  }

  @Get(':branchId/changes')
  @ApiOperation({
    summary: 'Get all changes made in this branch',
    description:
      'Returns all features that were added, modified, or deleted in this working branch compared to the main branch. Use this to preview changes before creating a merge request.',
  })
  @ApiResponse({
    status: 200,
    description: 'Branch changes retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Cannot get changes for main branch',
  })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async getBranchChanges(@Param('branchId') branchId: string) {
    return await this.gisService.getBranchChanges(branchId);
  }

  @Post(':branchId/features')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Add a new feature to a branch (only branch creator or admin for main)',
  })
  @ApiResponse({ status: 201, description: 'Feature added successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only edit branches you created',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Cannot modify inactive branch or invalid geometry',
  })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async addFeature(
    @Request() req,
    @Param('branchId') branchId: string,
    @Body() createFeatureDto: CreateFeatureDto,
  ) {
    return await this.gisService.addFeature(
      req.user.id,
      branchId,
      createFeatureDto,
    );
  }

  @Put(':branchId/features/:featureId')
  @ApiOperation({
    summary:
      'Update a feature in a branch (only branch creator or admin for main)',
  })
  @ApiResponse({ status: 200, description: 'Feature updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only edit branches you created',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Cannot modify inactive branch',
  })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  async updateFeature(
    @Request() req,
    @Param('featureId') featureId: string,
    @Body() updateFeatureDto: UpdateFeatureDto,
  ) {
    return await this.gisService.updateFeature(
      req.user.id,
      featureId,
      updateFeatureDto,
    );
  }

  @Delete(':branchId/features/:featureId')
  @ApiOperation({
    summary:
      'Delete a feature from a branch (only branch creator or admin for main) (soft delete)',
  })
  @ApiResponse({ status: 200, description: 'Feature deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only edit branches you created',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Cannot modify inactive branch',
  })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  async deleteFeature(@Request() req, @Param('featureId') featureId: string) {
    return await this.gisService.deleteFeature(req.user.id, featureId);
  }

  @Get(':branchId/has-active-merge-request')
  @ApiOperation({ summary: 'Check if branch has active merge request' })
  @ApiResponse({
    status: 200,
    description: 'Check completed',
    schema: {
      example: {
        hasActiveMergeRequest: true,
      },
    },
  })
  async hasActiveMergeRequest(@Param('branchId') branchId: string) {
    const hasActive = await this.gisService.hasActiveMergeRequest(branchId);
    return { hasActiveMergeRequest: hasActive };
  }

  @Get(':branchId/can-edit')
  @ApiOperation({ summary: 'Check if current user can edit this branch' })
  @ApiResponse({
    status: 200,
    description: 'Permission check completed',
    schema: {
      example: {
        canEdit: true,
        reason: 'You can only edit branches that you created',
      },
    },
  })
  async canEditBranch(@Request() req, @Param('branchId') branchId: string) {
    return await this.gisService.canUserEditBranch(
      req.user.id,
      branchId,
      req.user.role,
    );
  }
}
