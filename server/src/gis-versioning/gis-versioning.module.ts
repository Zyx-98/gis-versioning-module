import { Module } from '@nestjs/common';
import { GISVersioningService } from './services/gis-versioning.service';
import { ConflictResolutionService } from './services/conflict-resolution.service';
import {
  DatasetController,
  BranchController,
  MergeRequestController,
} from './controllers';
import { DepartmentGuard } from './guards/department.guard';

@Module({
  imports: [],
  controllers: [DatasetController, BranchController, MergeRequestController],
  providers: [GISVersioningService, ConflictResolutionService, DepartmentGuard],
  exports: [GISVersioningService, ConflictResolutionService],
})
export class GISVersioningModule {}
