import { IsOptional, IsString } from 'class-validator';

export class CreateProposalMessageDto {
  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  messageType?: string;
}
