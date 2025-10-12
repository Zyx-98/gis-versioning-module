import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDatasetDto {
  @ApiProperty({
    description: 'Name of the dataset',
    example: 'City Road Network',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the dataset',
    example:
      'Complete road network for the city including highways and streets',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Type of geometry stored in this dataset',
    enum: [
      'point',
      'line',
      'polygon',
      'multipoint',
      'multiline',
      'multipolygon',
      'geometry',
    ],
    example: 'line',
  })
  @IsEnum([
    'point',
    'line',
    'polygon',
    'multipoint',
    'multiline',
    'multipolygon',
    'geometry',
  ])
  @IsNotEmpty()
  geoType:
    | 'point'
    | 'line'
    | 'polygon'
    | 'multipoint'
    | 'multiline'
    | 'multipolygon'
    | 'geometry';
}
