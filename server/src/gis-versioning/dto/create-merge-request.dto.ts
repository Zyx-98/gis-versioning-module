import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMergeRequestDto {
  @ApiProperty({
    description: 'ID of the source branch (your working branch)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  sourceBranchId: string;

  @ApiPropertyOptional({
    description: 'Description of changes made in this merge request',
    example:
      'Added 10 new roads to the city network and updated 5 existing road attributes',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, {
    message: 'Description must not exceed 1000 characters',
  })
  description?: string;
}
