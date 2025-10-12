import { IsObject, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Geometry } from 'geojson';

export class UpdateFeatureDto {
  @ApiPropertyOptional({
    description: 'Updated GeoJSON geometry object',
    example: {
      type: 'Point',
      coordinates: [105.835, 21.028],
    },
  })
  @IsObject()
  @IsOptional()
  geometry?: Geometry;

  @ApiPropertyOptional({
    description: 'Updated properties/attributes of the feature',
    example: {
      name: 'Main Street (Updated)',
      type: 'highway',
      lanes: 6,
      maxSpeed: 100,
      status: 'under_construction',
    },
  })
  @IsObject()
  @IsOptional()
  properties?: Record<string, any>;
}
