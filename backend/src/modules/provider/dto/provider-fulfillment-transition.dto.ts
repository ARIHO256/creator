import { IsOptional, IsString } from 'class-validator';

export class ProviderFulfillmentTransitionDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
