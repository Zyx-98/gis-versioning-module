import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutBranchDto {
  @ApiProperty({
    description: 'ID of the dataset to create branch from',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  datasetId: string;

  @ApiProperty({
    description:
      'Name of the new branch (use kebab-case or feature/name format)',
    example: 'feature/add-new-roads',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-/]+$/, {
    message:
      'Branch name must contain only lowercase letters, numbers, hyphens, and forward slashes',
  })
  branchName: string;
}
