import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  subjectId!: string;

  @IsOptional()
  @IsString()
  subjectUserId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['CREATOR', 'SELLER', 'LISTING', 'SESSION', 'ORDER', 'CAMPAIGN'])
  subjectType?: 'CREATOR' | 'SELLER' | 'LISTING' | 'SESSION' | 'ORDER' | 'CAMPAIGN';

  @IsNumber()
  ratingOverall!: number;

  @IsOptional()
  @IsObject()
  ratingBreakdown?: Record<string, number>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  quickTags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  issueTags?: string[];

  @IsOptional()
  @IsString()
  reviewText?: string;

  @IsOptional()
  @IsBoolean()
  wouldJoinAgain?: boolean;

  @IsOptional()
  @IsString()
  transactionIntent?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  buyerName?: string;

  @IsOptional()
  @IsString()
  buyerType?: string;

  @IsOptional()
  @IsString()
  roleTarget?: string;

  @IsOptional()
  @IsString()
  itemType?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  marketplace?: string;

  @IsOptional()
  @IsString()
  mldzSurface?: string;

  @IsOptional()
  @IsString()
  sentiment?: string;

  @IsOptional()
  @IsBoolean()
  requiresResponse?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
