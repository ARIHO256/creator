import { IsString } from 'class-validator';

export class RespondInviteDto {
  @IsString()
  status!: string;
}
