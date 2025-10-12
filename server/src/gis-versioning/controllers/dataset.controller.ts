import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { GISVersioningService } from '../services/gis-versioning.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CreateDatasetDto } from '../dto';
import { UserRole } from 'src/database/enums';

@ApiTags('Datasets')
@ApiBearerAuth('JWT-auth')
@Controller('datasets')
@UseGuards(JwtAuthGuard)
export class DatasetController {
  constructor(private readonly gisService: GISVersioningService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new dataset (Admin only)' })
  @ApiResponse({ status: 201, description: 'Dataset created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  async createDataset(
    @Request() req,
    @Body() createDatasetDto: CreateDatasetDto,
  ) {
    return await this.gisService.createDataset(
      req.user.id,
      req.user.departmentId,
      createDatasetDto,
    );
  }

  @Get()
  @ApiOperation({ summary: "Get all datasets for the user's department" })
  @ApiResponse({ status: 200, description: 'Datasets retrieved successfully' })
  async getDatasets(@Request() req) {
    return await this.gisService.getDatasetsByDepartment(req.user.departmentId);
  }

  @Get(':datasetId')
  @ApiOperation({ summary: 'Get a single dataset by ID' })
  @ApiResponse({ status: 200, description: 'Dataset retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async getDataset(@Param('datasetId') datasetId: string) {
    return await this.gisService.getDatasetById(datasetId);
  }

  @Get(':datasetId/branches')
  @ApiOperation({ summary: 'Get all branches for a dataset' })
  @ApiResponse({ status: 200, description: 'Branches retrieved successfully' })
  async getBranches(@Param('datasetId') datasetId: string) {
    return await this.gisService.getBranchesByDataset(datasetId);
  }

  @Get(':datasetId/merge-requests')
  @ApiOperation({ summary: 'Get all merge requests for a dataset' })
  @ApiResponse({
    status: 200,
    description: 'Merge requests retrieved successfully',
  })
  async getMergeRequests(@Param('datasetId') datasetId: string) {
    return await this.gisService.getMergeRequests(datasetId);
  }
}
