import { IsString, MaxLength, MinLength } from 'class-validator';

export class CloseProposalNegotiationRoomDto {
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  reason!: string;
}
