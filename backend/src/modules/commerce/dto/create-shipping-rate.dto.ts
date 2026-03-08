import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateShippingRateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  @IsIn(['FLAT', 'WEIGHT', 'VALUE', 'REGION'])
  rateType?: 'FLAT' | 'WEIGHT' | 'VALUE' | 'REGION';

  @IsOptional()
  @IsNumber()
  minWeight?: number;

  @IsOptional()
  @IsNumber()
  maxWeight?: number;

  @IsOptional()
  @IsNumber()
  minOrderValue?: number;

  @IsOptional()
  @IsNumber()
  maxOrderValue?: number;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  etaDays?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
