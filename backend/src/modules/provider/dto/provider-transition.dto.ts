import { IsOptional, IsString } from 'class-validator';

export class ProviderTransitionDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
