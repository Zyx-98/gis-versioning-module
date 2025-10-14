import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMergeRequestDto {
  @ApiPropertyOptional({
    description: 'Updated description of changes made in this merge request',
    example: 'Updated 15 roads and added 5 new intersections',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, {
    message: 'Description must not exceed 1000 characters',
  })
  description?: string;
}
