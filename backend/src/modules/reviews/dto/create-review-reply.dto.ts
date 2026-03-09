import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateReviewReplyDto {
  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility?: 'PUBLIC' | 'PRIVATE';
}
