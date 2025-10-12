import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Dataset } from 'src/database/entities/dataset.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DepartmentGuard implements CanActivate {
  constructor(
    @InjectRepository(Dataset)
    private datasetRepo: Repository<Dataset>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const datasetId = request.params.datasetId || request.body.datasetId;

    if (!datasetId) {
      return true;
    }

    const dataset = await this.datasetRepo.findOne({
      where: { id: datasetId },
    });

    if (!dataset) {
      throw new ForbiddenException('Dataset not found');
    }

    if (dataset.departmentId !== user.departmentId) {
      throw new ForbiddenException('You do not have access to this dataset');
    }

    return true;
  }
}
