import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewMergeRequestDto {
  @ApiProperty({
    description: 'Comment explaining the approval or rejection decision',
    example:
      'Changes look good. All geometry validations passed. Approved for merge.',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, {
    message: 'Review comment must be at least 10 characters long',
  })
  @MaxLength(1000, {
    message: 'Review comment must not exceed 1000 characters',
  })
  comment: string;
}
