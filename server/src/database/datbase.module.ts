import { Global, Module } from '@nestjs/common';
import { databaseConfig } from './db.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { Dataset } from './entities/dataset.entity';
import { Department } from './entities/department.entity';
import { Feature } from './entities/feature.entity';
import { FeatureChange } from './entities/feature-change.entity';
import { MergeRequest } from './entities/merge-request.entity';
import { User } from './entities/user.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Branch,
      Dataset,
      Department,
      Feature,
      FeatureChange,
      MergeRequest,
      User,
    ]),
    TypeOrmModule.forRootAsync(databaseConfig),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
