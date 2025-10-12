import { IsObject, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Geometry } from 'geojson';

export class CreateFeatureDto {
  @ApiProperty({
    description: 'GeoJSON geometry object',
    example: {
      type: 'LineString',
      coordinates: [
        [105.8342, 21.0278],
        [105.8442, 21.0378],
      ],
    },
  })
  @IsObject()
  @IsNotEmpty()
  geometry: Geometry;

  @ApiPropertyOptional({
    description: 'Properties/attributes of the feature',
    example: {
      name: 'Main Street',
      type: 'highway',
      lanes: 4,
      maxSpeed: 80,
    },
  })
  @IsObject()
  @IsOptional()
  properties?: Record<string, any>;
}
