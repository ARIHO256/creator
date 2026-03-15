import { IsDateString, IsString } from 'class-validator';

export class ValidateAdzScheduleDto {
  @IsString()
  campaignId!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;
}
